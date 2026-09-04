import {createHash, randomInt} from 'node:crypto';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import {extname, isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';

import type {ComfyUIWorkflowId, ImageGenerationRequest} from '@masterflow/shared';

import masterflexTemplate from '../workflows/comfyui/masterflex-ipadapter-sdxl.v1.api.json' with {type: 'json'};
import photoMakerTemplate from '../workflows/comfyui/masterflow-photomaker-v2.v1.api.json' with {type: 'json'};
import runtimePins from '../workflows/comfyui/runtime-pins.v1.json' with {type: 'json'};

type WorkflowNode = {class_type: string; inputs: Record<string, unknown>};
export type ComfyUIWorkflow = Record<string, WorkflowNode>;

export interface ComfyUIWorkflowDescriptor {
  id: ComfyUIWorkflowId;
  label: string;
  purpose: string;
  version: '1';
  outputNodeId: string;
  sourceUiSha256: string;
  requiredNodes: string[];
}

export const COMFYUI_WORKFLOWS: Record<ComfyUIWorkflowId, ComfyUIWorkflowDescriptor> = {
  masterflex_ipadapter_sdxl_v1: {
    id: 'masterflex_ipadapter_sdxl_v1',
    label: 'MasterFlex · IPAdapter SDXL',
    purpose: 'Cohérence d’un personnage stylisé à partir d’une référence privée.',
    version: '1',
    outputNodeId: '10',
    sourceUiSha256: 'cc998493e0e2e06e735ff172795cb48e7961e18cddf115c6813be510d31b83f4',
    requiredNodes: ['CheckpointLoaderSimple', 'IPAdapterUnifiedLoader', 'IPAdapter', 'LoadImage', 'KSampler', 'SaveImage'],
  },
  masterflow_photomaker_v2_v1: {
    id: 'masterflow_photomaker_v2_v1',
    label: 'MasterFlow · PhotoMaker V2',
    purpose: 'Identité d’un portrait humain à partir de références privées consenties.',
    version: '1',
    outputNodeId: '9',
    sourceUiSha256: 'dece9eea2a6f9d4369f36186b404dc96b8a26c9c1534a76f3eb810c5ac09b155',
    requiredNodes: ['CheckpointLoaderSimple', 'PhotoMakerLoaderPlus', 'PhotoMakerLoraLoaderPlus', 'PhotoMakerEncodePlus', 'PrepImagesForClipVisionFromPath', 'KSampler', 'SaveImage'],
  },
};

const DEFAULT_NEGATIVE = 'text artifacts, unreadable typography, watermark, logo, photorealistic drift, childlike proportions';
let pinsVerified = false;

/**
 * Vérifie au runtime le contrat versionné et les hashes des templates réellement
 * importés. Les commits ComfyUI/custom nodes et hashes modèles restent des pins
 * opérateur : ils ne sont jamais téléchargés ni mis à jour par MasterFlow.
 */
export function assertComfyUIRuntimePins(): void {
  if (pinsVerified) return;
  if (runtimePins.schema_version !== 1 || runtimePins.status !== 'local_test_only_disabled') {
    throw new Error('comfyui_runtime_pins_invalid');
  }
  if (!/^[a-f0-9]{40}$/.test(runtimePins.comfyui.commit)) {
    throw new Error('comfyui_runtime_commit_pin_invalid');
  }
  if (runtimePins.custom_nodes.some((node) => !/^[a-f0-9]{40}$/.test(node.commit))) {
    throw new Error('comfyui_custom_node_pin_invalid');
  }
  if (runtimePins.models.some((model) => !/^[a-f0-9]{64}$/.test(model.sha256))) {
    throw new Error('comfyui_model_hash_pin_invalid');
  }

  const byId = new Map(runtimePins.workflows.map((pin) => [pin.workflow_id, pin]));
  for (const descriptor of Object.values(COMFYUI_WORKFLOWS)) {
    const pin = byId.get(descriptor.id);
    if (!pin || pin.source_ui_sha256 !== descriptor.sourceUiSha256) {
      throw new Error('comfyui_workflow_pin_missing');
    }
    const templatePath = fileURLToPath(new URL(`../workflows/comfyui/${pin.template_file}`, import.meta.url));
    const actual = createHash('sha256').update(readFileSync(templatePath)).digest('hex');
    if (actual !== pin.template_file_sha256) throw new Error('comfyui_workflow_hash_mismatch');
  }
  pinsVerified = true;
}

function cloneTemplate(value: unknown): ComfyUIWorkflow {
  return structuredClone(value) as ComfyUIWorkflow;
}

function boundedDimension(value: number | undefined, fallback: number): number {
  const dimension = value ?? fallback;
  if (dimension < 512 || dimension > 1024 || dimension % 64 !== 0) {
    throw new Error('comfyui_dimensions_require_512_1024_multiple_of_64');
  }
  return dimension;
}

function safeSeed(seed: number | undefined): number {
  if (seed !== undefined) return seed;
  return randomInt(0, 2 ** 31);
}

function outputPrefix(jobId: string, workflowId: ComfyUIWorkflowId): string {
  const safeJob = jobId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
  if (!safeJob) throw new Error('comfyui_job_id_invalid');
  return `MASTERFLOW/${workflowId}/${safeJob}`;
}

function assertPhotoMakerReferenceDirectory(referenceDir: string): void {
  let directImages: string[];
  try {
    if (!statSync(referenceDir).isDirectory()) throw new Error('not_directory');
    directImages = readdirSync(referenceDir).filter((name) =>
      ['.png', '.jpg', '.jpeg', '.webp'].includes(extname(name).toLowerCase()),
    );
  } catch {
    throw new Error('comfyui_photomaker_reference_dir_unavailable');
  }
  if (directImages.length < 1 || directImages.length > 4) {
    throw new Error('comfyui_photomaker_requires_1_to_4_direct_images');
  }
}

export function compileComfyUIWorkflow(
  workflowId: ComfyUIWorkflowId,
  request: ImageGenerationRequest,
  jobId: string,
  options: {photoMakerReferenceDir?: string; ipAdapterReferenceImage?: string} = {},
): {descriptor: ComfyUIWorkflowDescriptor; workflow: ComfyUIWorkflow; templateSha256: string} {
  assertComfyUIRuntimePins();
  const negative = request.negative_prompt?.trim() || DEFAULT_NEGATIVE;
  const width = boundedDimension(request.width, workflowId === 'masterflow_photomaker_v2_v1' ? 768 : 1024);
  const height = boundedDimension(request.height, workflowId === 'masterflow_photomaker_v2_v1' ? 768 : 1024);
  const seed = safeSeed(request.seed);
  let workflow: ComfyUIWorkflow;
  let templateSha256: string;

  if (workflowId === 'masterflex_ipadapter_sdxl_v1') {
    const referenceImage = options.ipAdapterReferenceImage?.trim();
    if (!referenceImage || referenceImage.startsWith('/') || referenceImage.includes('..')) {
      throw new Error('comfyui_ipadapter_staged_reference_required');
    }
    workflow = cloneTemplate(masterflexTemplate);
    templateSha256 = createHash('sha256').update(JSON.stringify(workflow)).digest('hex');
    workflow['3']!.inputs.image = referenceImage;
    workflow['4']!.inputs.text = request.prompt;
    workflow['5']!.inputs.text = negative;
    workflow['7']!.inputs = {width, height, batch_size: request.n};
    workflow['8']!.inputs.seed = seed;
    workflow['10']!.inputs.filename_prefix = outputPrefix(jobId, workflowId);
  } else if (workflowId === 'masterflow_photomaker_v2_v1') {
    const referenceDir = options.photoMakerReferenceDir?.trim();
    if (!referenceDir || !isAbsolute(referenceDir)) {
      throw new Error('comfyui_photomaker_reference_dir_required');
    }
    assertPhotoMakerReferenceDirectory(referenceDir);
    if (request.n !== 1) throw new Error('comfyui_photomaker_single_image_only');
    workflow = cloneTemplate(photoMakerTemplate);
    templateSha256 = createHash('sha256').update(JSON.stringify(workflow)).digest('hex');
    workflow['7']!.inputs.text = negative;
    workflow['11']!.inputs.text = /(^|\s)img(?=\s|[,.!?]|$)/i.test(request.prompt)
      ? request.prompt
      : `${request.prompt} img`;
    workflow['14']!.inputs.path = referenceDir;
    workflow['5']!.inputs = {width, height, batch_size: 1};
    workflow['3']!.inputs.seed = seed;
    workflow['9']!.inputs.filename_prefix = outputPrefix(jobId, workflowId);
  } else {
    const exhaustive: never = workflowId;
    throw new Error(`comfyui_workflow_not_allowlisted:${String(exhaustive)}`);
  }

  const descriptor = COMFYUI_WORKFLOWS[workflowId];
  const classes = new Set(Object.values(workflow).map((node) => node.class_type));
  if (descriptor.requiredNodes.some((node) => !classes.has(node))) {
    throw new Error('comfyui_workflow_required_node_missing');
  }
  return {descriptor, workflow, templateSha256};
}
