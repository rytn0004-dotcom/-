import * as THREE from 'three';
import { AnimeShaderStyle } from '../types/anime';

// Shared light direction uniform across all materials
export const globalLightDir = new THREE.Vector3(0.6, 0.8, 0.4).normalize();

/**
 * Creates an Inverted Hull Outline Material for crisp 3D anime inked lines
 */
export function createOutlineMaterial(
  color: THREE.ColorRepresentation = 0x111318,
  thickness: number = 0.024,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uThickness: { value: thickness },
    },
    vertexShader: `
      uniform float uThickness;
      void main() {
        // Extrude vertices outward along normals
        vec3 displaced = position + normal * uThickness;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      void main() {
        gl_FragColor = vec4(uColor, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: true,
  });
}

export interface CelMaterialOptions {
  color: THREE.ColorRepresentation;
  shadowColor?: THREE.ColorRepresentation;
  rimColor?: THREE.ColorRepresentation;
  map?: THREE.Texture | null;
  roughness?: number;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  wireframe?: boolean;
}

/**
 * Creates custom Anime Cel-Shading ShaderMaterial supporting multiple anime styles
 */
export function createCelMaterial(
  options: CelMaterialOptions,
  style: AnimeShaderStyle = 'anime_cel',
): THREE.ShaderMaterial {
  const baseColor = new THREE.Color(options.color);

  // Compute shadow color if not provided (slight hue shift towards cool purple/navy, typical in anime)
  let shadow = options.shadowColor
    ? new THREE.Color(options.shadowColor)
    : baseColor.clone().multiplyScalar(0.52).lerp(new THREE.Color(0x2d1b4e), 0.25);

  let rim = options.rimColor
    ? new THREE.Color(options.rimColor)
    : new THREE.Color(0xffffff);

  // Style-specific adjustments
  let styleIndex = 0; // 0: Classic, 1: Cyber, 2: Manga, 3: Sunset, 4: Sakura
  if (style === 'cyber_neon') {
    styleIndex = 1;
    rim = new THREE.Color(0x00f0ff);
  } else if (style === 'manga_ink') {
    styleIndex = 2;
    // High contrast ink
  } else if (style === 'sunset_golden') {
    styleIndex = 3;
    rim = new THREE.Color(0xffaa44);
    shadow = baseColor.clone().multiplyScalar(0.4).lerp(new THREE.Color(0x501a2e), 0.4);
  } else if (style === 'sakura_dream') {
    styleIndex = 4;
    rim = new THREE.Color(0xffd1dc);
    shadow = baseColor.clone().multiplyScalar(0.65).lerp(new THREE.Color(0x6b21a8), 0.2);
  }

  const uniforms: Record<string, THREE.IUniform> = {
    uBaseColor: { value: baseColor },
    uShadowColor: { value: shadow },
    uRimColor: { value: rim },
    uLightDir: { value: globalLightDir },
    uHasMap: { value: options.map ? 1.0 : 0.0 },
    uMap: { value: options.map || null },
    uStyle: { value: styleIndex },
    uTime: { value: 0 },
    uOpacity: { value: options.opacity ?? 1.0 },
    uEmissive: { value: new THREE.Color(options.emissive || 0x000000) },
    uEmissiveIntensity: { value: options.emissiveIntensity || 0.0 },
  };

  const mat = new THREE.ShaderMaterial({
    uniforms,
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec2 vUv;

      void main() {
        vUv = uv;
        // Transform normal to world space
        vNormal = normalize(mat3(modelMatrix) * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vViewPosition = cameraPosition - worldPos.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPos;
      }
    `,
    fragmentShader: `
      uniform vec3 uBaseColor;
      uniform vec3 uShadowColor;
      uniform vec3 uRimColor;
      uniform vec3 uLightDir;
      uniform sampler2D uMap;
      uniform float uHasMap;
      uniform int uStyle;
      uniform float uTime;
      uniform float uOpacity;
      uniform vec3 uEmissive;
      uniform float uEmissiveIntensity;

      varying vec3 vNormal;
      varying vec3 vViewPosition;
      varying vec2 vUv;

      void main() {
        vec3 N = normalize(vNormal);
        vec3 L = normalize(uLightDir);
        vec3 V = normalize(vViewPosition);

        float NdotL = dot(N, L);

        // Diffuse color from map or uniform
        vec4 texColor = vec4(1.0);
        if (uHasMap > 0.5) {
          texColor = texture2D(uMap, vUv);
        }
        vec3 diffuseBase = uBaseColor * texColor.rgb;

        // Cel shading stepped lighting calculation
        vec3 finalColor = diffuseBase;

        // Rim lighting (Fresnel)
        float rimFactor = 1.0 - max(dot(N, V), 0.0);
        rimFactor = smoothstep(0.65, 0.98, rimFactor);

        if (uStyle == 0) {
          // CLASSIC ANIME CEL SHADING
          // 2-3 clean stepped shade bands
          float shade = 1.0;
          if (NdotL < 0.1) {
            shade = 0.55;
          } else if (NdotL < 0.45) {
            shade = 0.82;
          }
          finalColor = mix(uShadowColor * texColor.rgb, diffuseBase, shade);

          // Specular anime hair/armor glint
          vec3 H = normalize(L + V);
          float NdotH = max(dot(N, H), 0.0);
          float spec = step(0.96, NdotH);
          finalColor += spec * vec3(0.35);

          // Subtle anime rim light
          finalColor += rimFactor * uRimColor * 0.45;

        } else if (uStyle == 1) {
          // CYBER NEON TOON
          float shade = smoothstep(-0.1, 0.25, NdotL);
          finalColor = mix(uShadowColor * texColor.rgb, diffuseBase, shade);

          // Vibrant neon edge glow + pulse
          float pulse = 0.85 + 0.15 * sin(uTime * 3.5);
          finalColor += rimFactor * uRimColor * 1.2 * pulse;

          // Subtle digital scanline
          float scanline = sin(gl_FragCoord.y * 1.5 + uTime * 6.0) * 0.04;
          finalColor += scanline;

        } else if (uStyle == 2) {
          // MANGA INK / HALFTONE SCREEN TONES
          // Convert to grayscale
          float gray = dot(diffuseBase, vec3(0.299, 0.587, 0.114));
          float shadeVal = NdotL * 0.5 + 0.5;

          // Screen-space halftone dot pattern
          vec2 screenPos = gl_FragCoord.xy * 0.25;
          float dotPattern = sin(screenPos.x) * cos(screenPos.y);

          vec3 inkColor = vec3(0.06, 0.06, 0.09);
          vec3 paperColor = vec3(0.96, 0.95, 0.92);

          if (shadeVal < 0.3) {
            finalColor = inkColor;
          } else if (shadeVal < 0.6) {
            finalColor = dotPattern > 0.0 ? inkColor : paperColor;
          } else {
            finalColor = paperColor;
          }

        } else if (uStyle == 3) {
          // SUNSET GOLDEN HOUR
          float shade = smoothstep(-0.2, 0.4, NdotL);
          vec3 warmSunsetLight = vec3(1.0, 0.75, 0.45);
          finalColor = mix(uShadowColor * texColor.rgb, diffuseBase * warmSunsetLight, shade);
          finalColor += rimFactor * uRimColor * 0.85;

        } else {
          // SAKURA DREAM / PASTEL
          float shade = smoothstep(-0.3, 0.3, NdotL);
          vec3 pastelTint = vec3(1.05, 0.95, 1.02);
          finalColor = mix(uShadowColor * texColor.rgb, diffuseBase * pastelTint, shade);
          finalColor += rimFactor * uRimColor * 0.6;
        }

        // Add Emissive if present
        finalColor += uEmissive * uEmissiveIntensity;

        float alpha = uOpacity * texColor.a;
        gl_FragColor = vec4(finalColor, alpha);
      }
    `,
    transparent: options.transparent || (options.opacity !== undefined && options.opacity < 1.0),
    side: THREE.FrontSide,
  });

  return mat;
}
