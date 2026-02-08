import { useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, PerspectiveCamera } from '@react-three/drei';

function Penguin() {
  const groupRef = useRef<THREE.Group>(null!);
  const { pointer } = useThree();

  useFrame(() => {
    if (groupRef.current) {
      const targetRotationY = pointer.x * 0.5;
      const targetRotationX = -pointer.y * 0.3;
      
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        targetRotationY,
        0.1
      );
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        targetRotationX,
        0.1
      );
    }
  });

  return (
    <group ref={groupRef} scale={0.75}>
      {/* Body - white */}
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshToonMaterial color="#ffffff" />
      </mesh>
      
      {/* Belly - light gray */}
      <mesh position={[0, -0.1, 0.45]}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshToonMaterial color="#f5f5f5" />
      </mesh>
      
      {/* Head - white */}
      <mesh position={[0, 0.6, 0]}>
        <sphereGeometry args={[0.35, 32, 32]} />
        <meshToonMaterial color="#ffffff" />
      </mesh>
      
      {/* Eyes - white */}
      <mesh position={[-0.12, 0.65, 0.28]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.12, 0.65, 0.28]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      
      {/* Pupils - black */}
      <mesh position={[-0.12, 0.65, 0.35]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      <mesh position={[0.12, 0.65, 0.35]}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      
      {/* Beak - orange */}
      <mesh position={[0, 0.55, 0.35]} rotation={[-Math.PI / 4, 0, 0]}>
        <coneGeometry args={[0.08, 0.15, 4]} />
        <meshToonMaterial color="#ff8c00" />
      </mesh>
      
      {/* Wings - white */}
      <mesh position={[-0.45, 0, 0]} rotation={[0, 0, -0.5]}>
        <sphereGeometry args={[0.15, 32, 32, 0, Math.PI]} />
        <meshToonMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.45, 0, 0]} rotation={[0, 0, 0.5]}>
        <sphereGeometry args={[0.15, 32, 32, 0, Math.PI]} />
        <meshToonMaterial color="#ffffff" />
      </mesh>
      
      {/* Feet - orange */}
      <mesh position={[-0.15, -0.5, 0.2]} rotation={[-0.3, -0.2, 0]}>
        <boxGeometry args={[0.15, 0.05, 0.25]} />
        <meshToonMaterial color="#ff8c00" />
      </mesh>
      <mesh position={[0.15, -0.5, 0.2]} rotation={[-0.3, 0.2, 0]}>
        <boxGeometry args={[0.15, 0.05, 0.25]} />
        <meshToonMaterial color="#ff8c00" />
      </mesh>
    </group>
  );
}

export default function FloatingModel() {
  return (
    <div className="fixed bottom-8 right-[-40px] w-[280px] h-[280px] pointer-events-none z-50 hidden lg:block">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 4]} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <pointLight position={[-3, 2, -3]} intensity={0.5} color="#87ceeb" />
        <Environment preset="sunset" />
        <Penguin />
      </Canvas>
    </div>
  );
}