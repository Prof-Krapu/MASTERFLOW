import { useEffect, useRef } from 'react';

/**
 * Props du composant {@link BlendCanvas}.
 *
 * @property blendWeight - Facteur de fusion dans [0..1].
 *   - 0   -> deux métaballs nettement séparées (personas distinctes).
 *   - 1   -> fusion complète en une seule chimère (blend total).
 * @property primaryColor - Couleur de la persona primaire (hex `#rrggbb`). Defaut violet `#6B2D5B`.
 * @property secondaryColor - Couleur de la persona secondaire (hex `#rrggbb`). Defaut vert `#39FF14`.
 * @property reducedMotion - Override optionnel du "mouvement reduit". Si fourni, il
 *   prime sur la detection interne : `true` fige une frame statique, `false` force
 *   l'animation. Si omis, le composant detecte lui-meme `prefers-reduced-motion`.
 */
export interface BlendCanvasProps {
  blendWeight: number;
  primaryColor?: string;
  secondaryColor?: string;
  reducedMotion?: boolean;
}

/** Couleur par defaut de la persona primaire (violet MasterFlow). */
const DEFAULT_PRIMARY = '#6B2D5B';
/** Couleur par defaut de la persona secondaire (vert Zerg). */
const DEFAULT_SECONDARY = '#39FF14';

/**
 * Vertex shader minimal : dessine un quad plein cadre (deux triangles).
 * La position est directement en clip-space, aucune matrice n'est necessaire.
 */
const VERTEX_SRC = `#version 100
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

/**
 * Fragment shader : DEUX métaballs fusionnées par un smooth-min polynomial.
 *
 * Le rendu repose sur des champs de distance (SDF de cercles) combinés par
 * `smin` (polynomial smooth min). Plus `u_blend` est haut, plus on rapproche
 * les centres ET on augmente `k`, ce qui materialise la fusion (chimère).
 * Un leger mouvement organique ("creep" Zerg) est pilote par `u_time`.
 */
const FRAGMENT_SRC = `#version 100
precision highp float;

uniform vec2  u_resolution; // taille du canvas en pixels
uniform float u_time;       // temps en secondes (0 si reduced-motion)
uniform float u_blend;      // facteur de fusion [0..1]
uniform vec3  u_primary;    // couleur persona primaire (lineaire 0..1)
uniform vec3  u_secondary;  // couleur persona secondaire (lineaire 0..1)

/**
 * Polynomial smooth min : fusionne deux distances en lissant la jonction.
 * @param a premiere distance
 * @param b seconde distance
 * @param k rayon de lissage (plus k est grand, plus la fusion est douce/large)
 */
float smin(float a, float b, float k) {
  // h dans [0..1] : 0 quand a et b sont eloignes, 1 quand ils se touchent.
  float h = clamp(0.5 + 0.5 * (b - a) / max(k, 1e-4), 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

/** Champ de distance d'une metaballe (cercle) de centre c et de rayon r. */
float ball(vec2 p, vec2 c, float r) {
  return length(p - c) - r;
}

void main() {
  // Coordonnees normalisees, ratio corrige, origine au centre.
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);

  float t = u_time;

  // Ecart horizontal des centres : large quand blend bas, nul quand blend haut.
  float sep = mix(0.42, 0.0, u_blend);

  // Derive organique "creep" : oscillations lentes desynchronisees.
  vec2 creepA = vec2(sin(t * 0.7) * 0.05, cos(t * 0.9 + 1.7) * 0.05);
  vec2 creepB = vec2(cos(t * 0.8 + 0.5) * 0.05, sin(t * 1.1) * 0.05);

  vec2 cA = vec2(-sep, 0.0) + creepA;
  vec2 cB = vec2( sep, 0.0) + creepB;

  // Rayons legerement pulsants pour l'effet vivant.
  float rA = 0.26 + 0.02 * sin(t * 1.3);
  float rB = 0.26 + 0.02 * cos(t * 1.5 + 0.9);

  float dA = ball(uv, cA, rA);
  float dB = ball(uv, cB, rB);

  // k croit avec le blend : la jonction se lisse et la chimere se forme.
  float k = mix(0.02, 0.45, u_blend);
  float d = smin(dA, dB, k);

  // Masque de surface (anti-aliasing par la derivee de l'ecran).
  float aa = fwidth(d) + 1e-4;
  float mask = 1.0 - smoothstep(0.0, aa, d);

  // Halo doux autour de la masse (glow Zerg).
  float glow = smoothstep(0.18, 0.0, d) * 0.6;

  // Melange des couleurs selon la proximite relative de chaque metaballe,
  // module par le blend (fusion = melange plus marque des deux teintes).
  float wA = clamp(0.5 + 0.5 * (dB - dA) / max(k, 1e-4), 0.0, 1.0);
  float tint = mix(wA, 0.5, u_blend);
  vec3 surface = mix(u_secondary, u_primary, tint);

  vec3 color = surface * (mask + glow);

  // Fond sombre legerement teinte pour eviter le noir pur.
  vec3 bg = mix(vec3(0.02, 0.01, 0.03), surface * 0.06, glow);
  color = mix(bg, color, max(mask, glow));

  gl_FragColor = vec4(color, 1.0);
}`;

/**
 * Convertit une couleur hex `#rrggbb` (ou `#rgb`) en triplet RGB [0..1].
 * Renvoie un fallback gris en cas de chaine invalide (robustesse runtime).
 */
function hexToRgb(hex: string): [number, number, number] {
  let h = hex.trim().replace(/^#/, '');
  if (h.length === 3) {
    const r = h[0] ?? '0';
    const g = h[1] ?? '0';
    const b = h[2] ?? '0';
    h = `${r}${r}${g}${g}${b}${b}`;
  }
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) {
    return [0.5, 0.5, 0.5];
  }
  const int = parseInt(h, 16);
  return [((int >> 16) & 0xff) / 255, ((int >> 8) & 0xff) / 255, (int & 0xff) / 255];
}

/**
 * Compile un shader et leve une erreur explicite en cas d'echec.
 * @param gl contexte WebGL
 * @param type `gl.VERTEX_SHADER` ou `gl.FRAGMENT_SHADER`
 * @param src source GLSL
 */
function compileShader(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) {
    throw new Error('Impossible de creer le shader WebGL.');
  }
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? 'inconnue';
    gl.deleteShader(shader);
    throw new Error(`Erreur de compilation du shader : ${log}`);
  }
  return shader;
}

/**
 * Cree et lie le programme GLSL (vertex + fragment).
 * @param gl contexte WebGL
 */
function createProgram(gl: WebGLRenderingContext): WebGLProgram {
  const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SRC);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC);
  const program = gl.createProgram();
  if (!program) {
    throw new Error('Impossible de creer le programme WebGL.');
  }
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  // Les shaders sont rattaches au programme : on peut les detacher/supprimer.
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? 'inconnue';
    gl.deleteProgram(program);
    throw new Error(`Erreur de liaison du programme : ${log}`);
  }
  return program;
}

/**
 * BlendCanvas — le "money-shot" : fusion visuelle de deux personas par
 * métaballs (smoothMin GLSL). Rend un `<canvas>` WebGL plein cadre.
 *
 * - `blendWeight` pilote l'ecart des centres + le facteur de lissage `k`.
 * - Mouvement organique "creep" via un uniform `time`.
 * - Respecte `prefers-reduced-motion` (frame statique, aucune animation).
 * - Gere le redimensionnement (resolution ajustee au devicePixelRatio).
 * - Nettoyage complet au demontage (cancelAnimationFrame + perte de contexte).
 */
export function BlendCanvas({
  blendWeight,
  primaryColor = DEFAULT_PRIMARY,
  secondaryColor = DEFAULT_SECONDARY,
  reducedMotion,
}: BlendCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // On garde les props dans des refs pour que la boucle d'animation lise
  // toujours les dernieres valeurs sans recreer le contexte WebGL.
  const blendRef = useRef<number>(blendWeight);
  const primaryRef = useRef<string>(primaryColor);
  const secondaryRef = useRef<string>(secondaryColor);
  blendRef.current = blendWeight;
  primaryRef.current = primaryColor;
  secondaryRef.current = secondaryColor;

  // Override optionnel du mouvement reduit (prop). `undefined` => detection interne.
  // L'effet principal expose une fonction d'application via cette ref afin de
  // reagir aux changements de prop sans recreer le contexte WebGL.
  const reducedMotionPropRef = useRef<boolean | undefined>(reducedMotion);
  reducedMotionPropRef.current = reducedMotion;
  const applyMotionRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
    if (!gl) {
      // Pas de WebGL disponible : on n'echoue pas brutalement.
      // eslint-disable-next-line no-console
      console.warn('BlendCanvas : WebGL indisponible sur ce navigateur.');
      return;
    }

    // L'extension OES_standard_derivatives fournit fwidth() en WebGL1.
    const derivatives = gl.getExtension('OES_standard_derivatives');
    if (!derivatives) {
      // eslint-disable-next-line no-console
      console.warn('BlendCanvas : OES_standard_derivatives indisponible, anti-aliasing degrade.');
    }

    let program: WebGLProgram;
    try {
      program = createProgram(gl);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('BlendCanvas :', err);
      return;
    }
    gl.useProgram(program);

    // Quad plein cadre : deux triangles couvrant [-1, 1]^2.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    );

    const aPosition = gl.getAttribLocation(program, 'a_position');
    if (aPosition < 0) {
      // eslint-disable-next-line no-console
      console.error('BlendCanvas : attribut a_position introuvable.');
      return;
    }
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    // Recuperation et verification non-null des locations d'uniforms.
    const uResolution = gl.getUniformLocation(program, 'u_resolution');
    const uTime = gl.getUniformLocation(program, 'u_time');
    const uBlend = gl.getUniformLocation(program, 'u_blend');
    const uPrimary = gl.getUniformLocation(program, 'u_primary');
    const uSecondary = gl.getUniformLocation(program, 'u_secondary');
    if (
      uResolution === null ||
      uTime === null ||
      uBlend === null ||
      uPrimary === null ||
      uSecondary === null
    ) {
      // eslint-disable-next-line no-console
      console.error('BlendCanvas : uniform(s) introuvable(s).');
      return;
    }

    // Detection du mode "mouvement reduit" : la prop `reducedMotion` prime,
    // sinon on retombe sur la media query systeme.
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const resolveReducedMotion = (): boolean =>
      reducedMotionPropRef.current ?? motionQuery.matches;
    let prefersReducedMotion = resolveReducedMotion();

    /** Ajuste la resolution du canvas au conteneur et au devicePixelRatio. */
    const resize = (): void => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    /** Dessine une frame ; `timeSeconds` est fige a 0 si reduced-motion. */
    const draw = (timeSeconds: number): void => {
      gl.uniform2f(uResolution, canvas.width, canvas.height);
      gl.uniform1f(uTime, prefersReducedMotion ? 0 : timeSeconds);
      gl.uniform1f(uBlend, Math.min(1, Math.max(0, blendRef.current)));
      const [pr, pg, pb] = hexToRgb(primaryRef.current);
      const [sr, sg, sb] = hexToRgb(secondaryRef.current);
      gl.uniform3f(uPrimary, pr, pg, pb);
      gl.uniform3f(uSecondary, sr, sg, sb);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };

    let rafId = 0;
    let start = 0;

    /** Boucle d'animation (creep continu) quand le mouvement est autorise. */
    const loop = (now: number): void => {
      if (start === 0) {
        start = now;
      }
      resize();
      draw((now - start) / 1000);
      rafId = window.requestAnimationFrame(loop);
    };

    /** Rendu d'une unique frame statique (reduced-motion ou fallback). */
    const renderStatic = (): void => {
      resize();
      draw(0);
    };

    /**
     * (Re)synchronise l'etat d'animation avec la preference courante de mouvement.
     * Demarre la boucle si l'animation est permise, fige une frame sinon.
     * Idempotent : sans changement d'etat, ne fait que rafraichir si besoin.
     */
    const applyMotion = (): void => {
      prefersReducedMotion = resolveReducedMotion();
      if (prefersReducedMotion) {
        if (rafId !== 0) {
          window.cancelAnimationFrame(rafId);
          rafId = 0;
        }
        renderStatic();
      } else if (rafId === 0) {
        start = 0;
        rafId = window.requestAnimationFrame(loop);
      }
    };
    // Expose l'applicateur a l'effet qui surveille la prop `reducedMotion`.
    applyMotionRef.current = applyMotion;

    applyMotion();

    // Reagit au redimensionnement de la fenetre.
    const onResize = (): void => {
      if (prefersReducedMotion) {
        renderStatic();
      }
      // En mode anime, le resize() est deja appele a chaque frame.
    };
    window.addEventListener('resize', onResize);

    // Reagit aux changements de preference systeme de mouvement a chaud.
    const onMotionChange = (): void => {
      applyMotion();
    };
    motionQuery.addEventListener('change', onMotionChange);

    // Nettoyage complet au demontage.
    return () => {
      if (rafId !== 0) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
      }
      window.removeEventListener('resize', onResize);
      motionQuery.removeEventListener('change', onMotionChange);
      applyMotionRef.current = null;
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      // Force la liberation du contexte GPU.
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  // Reagit aux changements de la prop `reducedMotion` (override du parent)
  // sans recreer le contexte WebGL : on rejoue simplement l'applicateur.
  useEffect(() => {
    applyMotionRef.current?.();
  }, [reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%' }}
      aria-hidden="true"
    />
  );
}

export default BlendCanvas;
