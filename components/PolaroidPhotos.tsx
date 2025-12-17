import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CONFIG } from '../constants';
import { getConePoint, getRandomSpherePoint } from '../utils/math';
import { TreeState } from '../types';

type Photo = {
  id: string;
  src: string;
  caption?: string;
  baseRotationZ: number;
  targetPos: THREE.Vector3;
  chaosPos: THREE.Vector3;
  outwardQuat: THREE.Quaternion;
};

interface PolaroidPhotosProps {
  treeState: TreeState;
  onSelect: (photo: { src: string; caption?: string }) => void;
}

export const PolaroidPhotos: React.FC<PolaroidPhotosProps> = ({ treeState, onSelect }) => {
  const progressRef = useRef(0);
  const [files, setFiles] = useState<string[]>([]);
  const [items, setItems] = useState<Array<{ id: string; src: string; caption: string }>>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Served from /public so this works without bundler-specific features.
        const manifestUrl = new URL('./figs-jpeg/manifest.json', document.baseURI).toString();
        const res = await fetch(manifestUrl, { cache: 'no-cache' });
        if (!res.ok) throw new Error(`manifest fetch failed: ${res.status}`);
        const json = (await res.json()) as { files?: string[] } | string[];
        const list = Array.isArray(json) ? json : json.files;
        if (!cancelled) setFiles(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setFiles([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Preload images and filter out broken URLs (prevents hard-crash/black screen).
  useEffect(() => {
    let cancelled = false;

    const candidates = files.map((fileName, idx) => {
      const caption = fileName.replace(/\.[^.]+$/, '');
      // Use baseURI so this works under sub-paths (e.g. GitHub Pages /repo/).
      const src = new URL(`./figs-jpeg/${fileName}`, document.baseURI).toString();
      return { id: `p${idx + 1}`, src, caption };
    });

    (async () => {
      const loaded = await Promise.all(
        candidates.map(
          (c) =>
            new Promise<typeof c | null>((resolve) => {
              const img = new Image();
              img.onload = () => resolve(c);
              img.onerror = () => resolve(null);
              img.src = c.src;
            })
        )
      );
      if (!cancelled) setItems(loaded.filter(Boolean) as Array<{ id: string; src: string; caption: string }>);
    })();

    return () => {
      cancelled = true;
    };
  }, [files]);

  const photos = useMemo<Photo[]>(() => {
    const verticalBias = 1; // keep consistent with other scene elements
    const yShift = 5.0; // keep consistent with other scene elements

    // Pick a y-range that avoids both the very base and the very tip.
    // Note: because of the way `getConePoint` is used in this scene, world-space y ends up
    // effectively matching the sampled internal y in [0, CONFIG.treeHeight].
    const minY = 1.8;
    const maxY = CONFIG.treeHeight - 2.8;

    const getConePointAtY = (yInternal: number, maxRadius: number) => {
      const y = THREE.MathUtils.clamp(yInternal, 0, CONFIG.treeHeight);
      const rAtY = (1 - y / CONFIG.treeHeight) * maxRadius;
      const angle = Math.random() * Math.PI * 2;
      const r = Math.sqrt(Math.random()) * rAtY;
      return new THREE.Vector3(
        r * Math.cos(angle),
        y - CONFIG.treeHeight / 2 + verticalBias,
        r * Math.sin(angle)
      );
    };

    const result: Photo[] = [];

    for (let i = 0; i < items.length; i++) {
      // Distribute photos across different height bands (prevents clustering at the top).
      const bandT = (i + 0.5) / items.length; // 0..1, centered per index
      const jitter = (Math.random() - 0.5) * 1.2; // +-0.6
      const yInternal = THREE.MathUtils.clamp(
        minY + (maxY - minY) * bandT + jitter,
        minY,
        maxY
      );

      // Pick a point at this height, then push outward so it sits on foliage.
      const t = getConePointAtY(yInternal, CONFIG.treeRadius * 0.9);
      t.y += yShift; // sync with tree shift

      const dist = Math.sqrt(t.x * t.x + t.z * t.z);
      if (dist > 0.001) {
        // Push outward a bit so photos don't get buried in the tree.
        const push = 1.35 + Math.random() * 0.15;
        t.x *= push;
        t.z *= push;
      }

      // Face outward from the trunk (so it feels "hung" on the tree).
      const tmp = new THREE.Object3D();
      tmp.position.copy(t);
      tmp.lookAt(0, t.y, 0);
      tmp.rotateY(Math.PI);
      tmp.updateMatrixWorld(true);

      result.push({
        id: items[i].id,
        src: items[i].src,
        caption: items[i].caption,
        baseRotationZ: (Math.random() - 0.5) * 0.35,
        targetPos: t,
        chaosPos: getRandomSpherePoint(18),
        outwardQuat: new THREE.Quaternion().copy(tmp.quaternion),
      });
    }

    return result;
  }, [items]);

  // IMPORTANT: always call hooks in the same order.
  // When the manifest hasn't loaded yet, we still call useTexture with a placeholder.
  const placeholder =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMB/ax0f+UAAAAASUVORK5CYII=';
  const textures = useTexture(photos.length ? photos.map((p) => p.src) : [placeholder]) as THREE.Texture[];

  useEffect(() => {
    for (const tex of textures) {
      if (!tex) continue;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.anisotropy = 8;
      tex.needsUpdate = true;
    }
  }, [textures]);

  useFrame((state) => {
    const dest = treeState === TreeState.FORMED ? 1 : 0;
    // Smoothly move between chaos and formed.
    progressRef.current += (dest - progressRef.current) * 0.02;
  });

  if (photos.length === 0) return null;

  return (
    <group>
      {photos.map((p, idx) => {
        const tex = textures[idx];
        return (
          <PolaroidPhoto
            key={p.id}
            photo={p}
            index={idx}
            texture={tex}
            progressRef={progressRef}
            treeState={treeState}
            onSelect={onSelect}
          />
        );
      })}
    </group>
  );
};

function PolaroidPhoto({
  photo,
  index,
  texture,
  progressRef,
  treeState,
  onSelect,
}: {
  photo: Photo;
  index: number;
  texture: THREE.Texture | undefined;
  progressRef: React.RefObject<number>;
  treeState: TreeState;
  onSelect: (photo: { src: string; caption?: string }) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const p = progressRef.current ?? 0;
    const time = state.clock.getElapsedTime();

    const target = photo.targetPos.clone();
    const chaos = photo.chaosPos.clone();

    if (treeState === TreeState.FORMED) {
      // Gentle hanging wobble.
      target.y += Math.sin(time * 1.6 + index) * 0.08;
      target.x += Math.cos(time * 1.2 + index) * 0.04;
    } else {
      chaos.x += Math.sin(time + index) * 0.1;
      chaos.y += Math.cos(time + index) * 0.1;
    }

    groupRef.current.position.lerpVectors(chaos, target, p);
    groupRef.current.quaternion.copy(photo.outwardQuat);
    groupRef.current.rotation.z +=
      photo.baseRotationZ +
      Math.sin(time * 0.8 + index) * 0.03 * (treeState === TreeState.FORMED ? 1 : 0);

    // Subtle spin like other ornaments.
    groupRef.current.rotation.y += time * 0.15;
  });

  // Polaroid dimensions in world units (scaled uniformly -> keeps aspect ratio)
  const scale = 0.80; // smaller than before
  const frameW = 1.0;
  const frameH = 1.28;
  const photoW = 0.86;
  const photoH = 0.86;
  const photoYOffset = 0.1; // shift up to leave larger bottom border

  return (
    <group
      ref={groupRef}
      scale={scale}
      onPointerDown={(e) => {
        e.stopPropagation();
        onSelect({ src: photo.src, caption: photo.caption });
      }}
    >
      {/* Frame */}
      <mesh>
        <planeGeometry args={[frameW, frameH]} />
        <meshStandardMaterial
          color="#F8F5EE"
          roughness={0.85}
          metalness={0.05}
          emissive="#111111"
          emissiveIntensity={0.05}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Photo */}
      <mesh position={[0, photoYOffset, 0.001]}>
        <planeGeometry args={[photoW, photoH]} />
        <meshBasicMaterial map={texture} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Subtle shadow backing */}
      <mesh position={[0, -0.02, -0.002]}>
        <planeGeometry args={[frameW * 1.01, frameH * 1.01]} />
        <meshStandardMaterial
          color="#000000"
          transparent
          opacity={0.18}
          roughness={1}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
