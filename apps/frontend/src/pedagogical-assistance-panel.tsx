import {useState} from 'react';
import type {ReactElement} from 'react';

import type {
  PedagogicalAllowedHelp,
  PedagogicalAssistanceDecision,
  PedagogicalAssistanceRequestType,
  PedagogicalForbiddenOutput,
} from '@masterflow/shared';

import {classifyPedagogicalAssistance} from './api.ts';

const INTENTS: Array<{value: PedagogicalAssistanceRequestType; label: string}> = [
  {value: 'understand_concept', label: 'Expliquer une notion'},
  {value: 'advance_project', label: 'Faire avancer un projet'},
  {value: 'frame_subject', label: 'Cadrer un sujet'},
  {value: 'review_user_work', label: 'Relire un travail existant'},
  {value: 'correct_or_evaluate', label: 'Préparer une correction'},
  {value: 'request_learning_resource', label: 'Trouver une ressource ou une vidéo'},
  {value: 'request_final_deliverable', label: 'Obtenir un rendu final prêt à remettre'},
];

const HELP_LABELS: Record<PedagogicalAllowedHelp, string> = {
  explain_concept: 'expliquer la notion',
  provide_example: 'donner un exemple',
  explain_method: 'expliquer la méthode',
  ask_guiding_questions: 'poser des questions guidées',
  provide_checklist: 'fournir une checklist',
  propose_next_step: 'proposer la prochaine étape',
  review_user_work: 'relire le travail existant',
  propose_candidate_feedback: 'préparer un feedback candidat',
  recommend_validated_resource: 'recommander une ressource vérifiée',
  propose_resource_candidate: 'proposer une ressource à vérifier',
  include_video_timecode: 'pointer le bon timecode',
};

const FORBIDDEN_LABELS: Record<PedagogicalForbiddenOutput, string> = {
  ready_to_submit_deliverable: 'livrable final prêt à rendre',
  final_grade: 'note finale automatique',
  direct_publication: 'publication ou envoi direct',
  invented_source: 'source inventée ou non vérifiée',
  automatic_sanction: 'sanction automatique',
  permission_bypass: 'contournement des permissions',
  forced_autoplay: 'lecture vidéo imposée',
};

const KIND_LABELS: Record<PedagogicalAssistanceDecision['assistance_kind'], string> = {
  guide: 'Guidage',
  explain: 'Explication',
  coach: 'Coaching',
  review: 'Relecture',
  candidate_output: 'Proposition à valider',
  blocked_integrity: 'Demande recadrée',
};

const HELP_PROMPTS: Record<PedagogicalAssistanceRequestType, string> = {
  understand_concept: 'Aide-moi à comprendre cette notion, puis vérifie ma compréhension avec une question.',
  advance_project: 'Aide-moi à identifier la prochaine étape utile de mon projet sans faire le travail à ma place.',
  frame_subject: 'Aide-moi à cadrer ce sujet avec des objectifs et des contraintes clairs.',
  review_user_work: 'Aide-moi à relire ce travail existant et à repérer ce que je peux améliorer.',
  correct_or_evaluate: 'Aide-moi à préparer une correction explicable, sans produire de note finale automatique.',
  request_learning_resource: 'Aide-moi à trouver une ressource fiable et indique-moi précisément ce qu’elle peut m’apprendre.',
  request_final_deliverable: 'Aide-moi à construire mon livrable étape par étape sans le produire à ma place.',
  attempt_circumvention: 'Aide-moi dans les limites autorisées et explique-moi pourquoi une demande doit être recadrée.',
};

type Props = {
  hasValidatedResources: boolean;
  mode: 'learn' | 'teaching';
  onRequestHelp?: (draft: string) => void;
  token: string;
};

export function PedagogicalAssistancePanel({
  hasValidatedResources,
  mode,
  onRequestHelp,
  token,
}: Props): ReactElement {
  const availableIntents = mode === 'learn'
    ? INTENTS.filter((item) => !['frame_subject', 'correct_or_evaluate'].includes(item.value))
    : INTENTS;
  const [intent, setIntent] = useState<PedagogicalAssistanceRequestType>(
    mode === 'learn' ? 'understand_concept' : 'advance_project',
  );
  const [decision, setDecision] = useState<PedagogicalAssistanceDecision | null>(null);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  async function inspectAssistance(continueToChat = false): Promise<void> {
    setLoading(true);
    setStatus('');
    setDecision(null);
    try {
      const next = await classifyPedagogicalAssistance({
        active_mode: mode,
        request_type: intent,
        source_state: intent === 'request_learning_resource'
          ? hasValidatedResources ? 'validated' : 'missing'
          : 'not_applicable',
        resource_timecode_requested: intent === 'request_learning_resource',
      }, token);
      setDecision(next);
      if (continueToChat && onRequestHelp) {
        onRequestHelp(HELP_PROMPTS[intent]);
        setStatus('Demande préparée dans le chat. Relis-la puis envoie-la quand elle te convient.');
      }
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Cadre d’aide indisponible.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="pedagogical-assistance" aria-label="Cadre d’aide pédagogique">
      <div className="pedagogical-assistance__heading">
        <div>
          <strong>Comment MasterFlow peut m’aider ?</strong>
          <p>Choisis ton objectif : aucune action n’est lancée depuis ce panneau.</p>
        </div>
        {decision ? (
          <span className={`pedagogical-assistance__state pedagogical-assistance__state--${decision.safety_state_hint}`}>
            {KIND_LABELS[decision.assistance_kind]}
          </span>
        ) : null}
      </div>

      <div className="pedagogical-assistance__controls">
        <label>
          <span>Je veux…</span>
          <select
            onChange={(event) => {
              setIntent(event.target.value as PedagogicalAssistanceRequestType);
              setDecision(null);
            }}
            value={intent}
          >
            {availableIntents.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>
        </label>
        <div className="pedagogical-assistance__actions">
          {onRequestHelp ? (
            <button
              disabled={loading}
              onClick={() => void inspectAssistance(true)}
              type="button"
            >
              {loading ? 'Préparation…' : 'Demander de l’aide'}
            </button>
          ) : null}
          <button
            className={onRequestHelp ? 'secondary' : undefined}
            disabled={loading}
            onClick={() => void inspectAssistance(false)}
            type="button"
          >
            {onRequestHelp ? 'Voir les limites' : 'Voir le cadre d’aide'}
          </button>
        </div>
      </div>

      {status ? (
        <p
          className={decision ? 'pedagogical-assistance__status' : 'pedagogical-assistance__error'}
          role={decision ? 'status' : 'alert'}
        >
          {status}
        </p>
      ) : null}

      {decision ? (
        <div className="pedagogical-assistance__decision" aria-live="polite">
          <div>
            <strong>MasterFlow peut</strong>
            <ul>
              {decision.allowed_help.map((item) => <li key={item}>{HELP_LABELS[item]}</li>)}
            </ul>
          </div>
          <div>
            <strong>MasterFlow ne fera pas</strong>
            <ul>
              {decision.forbidden_outputs.map((item) => (
                <li key={item}>{FORBIDDEN_LABELS[item]}</li>
              ))}
            </ul>
          </div>
          {decision.validation_required ? (
            <p className="pedagogical-assistance__validation">
              <strong>Validation humaine requise.</strong> {decision.validation_reason}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
