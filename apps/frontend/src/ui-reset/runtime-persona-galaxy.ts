import {
  Boxes,
  GraduationCap,
  Paintbrush,
  Sparkles,
  UsersRound,
  WandSparkles,
  Workflow,
} from 'lucide-react';
import type {RuntimeUserProfile} from '@masterflow/shared';

import type {
  PrototypePersonaMetric,
  PrototypeSkillArc,
  PrototypeSkillArcId,
  PrototypeSkillFamilyId,
} from './prototype-skilltree-surface';

type RuntimeGalaxyPalette = Record<PrototypeSkillFamilyId, string>;

type RuntimePersonaGalaxy = {
  rankScore: number;
  shortLabels: Record<string, string>;
  skillArcs: PrototypeSkillArc[];
  stats: PrototypePersonaMetric[];
};

const arcOrder = ['creation', 'direction', 'pedagogy', 'structure'] as const;

const arcConfig: Record<(typeof arcOrder)[number], {
  galaxyTitle: string;
  icon: typeof Sparkles;
  label: string;
  primaryFamily: PrototypeSkillFamilyId;
}> = {
  creation: {
    galaxyTitle: 'Les idées prennent forme avant de demander la permission',
    icon: WandSparkles,
    label: 'Création',
    primaryFamily: 'story',
  },
  direction: {
    galaxyTitle: 'Le goût devient une direction, puis un système',
    icon: Paintbrush,
    label: 'Direction',
    primaryFamily: 'image',
  },
  pedagogy: {
    galaxyTitle: 'On apprend en fabriquant quelque chose qui compte',
    icon: GraduationCap,
    label: 'Pédagogie',
    primaryFamily: 'soft',
  },
  structure: {
    galaxyTitle: 'Le chaos créatif trouve enfin ses points d’ancrage',
    icon: Workflow,
    label: 'Structure',
    primaryFamily: 'system',
  },
};

const familyIcons = {
  image: Paintbrush,
  volume: Boxes,
  system: Workflow,
  story: Sparkles,
  soft: UsersRound,
} satisfies Record<PrototypeSkillFamilyId, typeof Sparkles>;

const autonomyScores: Record<string, number> = {
  unknown: 0,
  dependent: 20,
  assisted: 42,
  independent: 64,
  initiative: 82,
  mentor: 96,
};

function average(values: number[]): number {
  return values.length > 0
    ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    : 0;
}

export function buildRuntimePersonaGalaxy(
  profile: RuntimeUserProfile | null,
  palette: RuntimeGalaxyPalette,
): RuntimePersonaGalaxy | null {
  if (!profile || profile.professional_skills.length === 0) return null;

  const skillArcs = arcOrder.flatMap((arcId) => {
    const runtimeSkills = profile.professional_skills.filter((skill) => skill.arc === arcId);
    if (runtimeSkills.length === 0) return [];
    const config = arcConfig[arcId];
    const mastery = average(runtimeSkills.map((skill) => skill.mastery_score));
    const autonomy = average(runtimeSkills.map((skill) => autonomyScores[skill.autonomy_level ?? 'unknown'] ?? 0));
    const confidence = average(runtimeSkills.map((skill) => skill.confidence * 100));
    const color = palette[config.primaryFamily];
    return [{
      id: arcId as PrototypeSkillArcId,
      label: config.label,
      galaxyTitle: config.galaxyTitle,
      icon: config.icon,
      color,
      metrics: [
        {id: `${arcId}-mastery`, value: mastery, masteryValue: mastery, label: `Maîtrise ${config.label}`, color},
        {id: `${arcId}-autonomy`, value: autonomy, masteryValue: autonomy, label: `Autonomie ${config.label}`, color: palette.system},
        {id: `${arcId}-confidence`, value: confidence, masteryValue: mastery, label: 'Confiance des preuves', color: palette.soft},
      ],
      skills: runtimeSkills.map((skill) => ({
        label: skill.label,
        masteryLabel: `${skill.mastery_score}% de maîtrise`,
        icon: familyIcons[skill.family],
        weight: 0.72 + skill.confidence * 0.78,
        mastery: skill.mastery_score,
        xp: Math.round(skill.confidence * 100),
        family: skill.family,
      })),
    } satisfies PrototypeSkillArc];
  });

  const stats = skillArcs.map((arc) => ({
    id: arc.id,
    value: arc.metrics[0]?.value ?? 0,
    masteryValue: arc.metrics[0]?.masteryValue ?? 0,
    label: arc.metrics[0]?.label ?? arc.label,
    color: arc.color,
  }));
  const shortLabels = Object.fromEntries(skillArcs.map((arc) => [arc.id, arc.label]));
  return {
    rankScore: average(profile.professional_skills.map((skill) => skill.mastery_score)),
    shortLabels,
    skillArcs,
    stats,
  };
}
