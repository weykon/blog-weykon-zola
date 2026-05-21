import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface FloatingObject {
  mesh: THREE.Mesh;
  initialPosition: THREE.Vector3;
  floatOffset: number;
  floatSpeed: number;
  rotationSpeed: THREE.Vector3;
  objectType: 'paper' | 'notebook' | 'folder' | 'card' | 'sticky';
}

const FloatingPapers: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    objects: FloatingObject[];
    mouse: THREE.Vector2;
    targetMouse: THREE.Vector2;
  } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = null;

    // Camera
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 10;

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Lighting - softer, warmer
    const ambientLight = new THREE.AmbientLight(0xfff8f0, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 0.7);
    keyLight.position.set(5, 8, 7);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xfff5e6, 0.3);
    fillLight.position.set(-5, 3, 5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xe6f0ff, 0.25);
    rimLight.position.set(0, -5, -5);
    scene.add(rimLight);

    // Paper palette - warm cream tones
    const paperColors = {
      cream: 0xfaf6f0,
      ivory: 0xfaf8f5,
      antique: 0xf5ebe0,
      beige: 0xf0e6d8,
      warmWhite: 0xfffef9,
      oatmeal: 0xe8dfd5,
    };

    // Accent colors for sticky notes / folders
    const accentColors = {
      manila: 0xd4c4a8,
      yellowSticky: 0xfaf3c0,
      pinkSticky: 0xfce4ec,
      blueSticky: 0xe3f2fd,
      sage: 0xe8f0e8,
    };

    const objects: FloatingObject[] = [];

    // Create a paper sheet with subtle texture effect
    const createPaperSheet = (
      w: number,
      h: number,
      color: number,
      opacity: number = 1
    ) => {
      const geometry = new THREE.PlaneGeometry(w, h);
      const material = new THREE.MeshStandardMaterial({
        color,
        side: THREE.DoubleSide,
        roughness: 0.95,
        metalness: 0,
        transparent: opacity < 1,
        opacity,
      });
      return new THREE.Mesh(geometry, material);
    };

    // Create notebook with spine
    const createNotebook = (w: number, h: number, color: number) => {
      const group = new THREE.Group();
      const cover = createPaperSheet(w, h, color);
      const spineWidth = 0.08;
      const spine = createPaperSheet(spineWidth, h - 0.1, 0xd4c4a8, 0.9);
      spine.position.x = -(w / 2) + spineWidth / 2;
      group.add(cover);
      group.add(spine);
      return group;
    };

    // Create folder
    const createFolder = (w: number, h: number) => {
      const group = new THREE.Group();
      const back = createPaperSheet(w, h, 0xd4c4a8);
      const tab = createPaperSheet(w * 0.3, h * 0.15, 0xd4c4a8);
      tab.position.set(-w * 0.25, h / 2 - 0.05, 0.01);
      group.add(back);
      group.add(tab);
      return group;
    };

    // Create sticky note
    const createStickyNote = (size: number, color: number) => {
      const geometry = new THREE.PlaneGeometry(size, size);
      const material = new THREE.MeshStandardMaterial({
        color,
        side: THREE.DoubleSide,
        roughness: 0.9,
        metalness: 0,
      });
      return new THREE.Mesh(geometry, material);
    };

    // Create card
    const createCard = (w: number, h: number, color: number) => {
      const geometry = new THREE.PlaneGeometry(w, h);
      const material = new THREE.MeshStandardMaterial({
        color,
        side: THREE.DoubleSide,
        roughness: 0.85,
        metalness: 0.05,
      });
      return new THREE.Mesh(geometry, material);
    };

    // Object configurations
    const objectConfigs: Array<{
      type: FloatingObject['objectType'];
      creator: () => THREE.Group | THREE.Mesh;
      x: number;
      y: number;
      z: number;
      rx: number;
      ry: number;
      rz: number;
      floatOffset: number;
      floatSpeed: number;
      rotSpeed: [number, number, number];
    }> = [
      // Notebook left
      {
        type: 'notebook',
        creator: () => createNotebook(1.4, 1.8, paperColors.cream),
        x: -3.2,
        y: 1.2,
        z: -1,
        rx: 0.1,
        ry: -0.3,
        rz: 0.05,
        floatOffset: 0,
        floatSpeed: 0.35,
        rotSpeed: [0.001, 0.0015, 0.0005],
      },
      // Main paper center-left
      {
        type: 'paper',
        creator: () => createPaperSheet(1.8, 2.2, paperColors.ivory),
        x: -2.5,
        y: -0.5,
        z: 0,
        rx: 0.15,
        ry: 0.2,
        rz: -0.02,
        floatOffset: 1,
        floatSpeed: 0.28,
        rotSpeed: [0.001, 0.002, 0.0008],
      },
      // Folder right
      {
        type: 'folder',
        creator: () => createFolder(1.6, 2.0),
        x: 2.8,
        y: 0.8,
        z: -0.5,
        rx: -0.1,
        ry: 0.25,
        rz: 0.03,
        floatOffset: 2.5,
        floatSpeed: 0.32,
        rotSpeed: [0.0008, 0.0012, 0.0003],
      },
      // Sticky note top right
      {
        type: 'sticky',
        creator: () => createStickyNote(0.6, accentColors.yellowSticky),
        x: 3.0,
        y: -1.2,
        z: 0.5,
        rx: 0.2,
        ry: -0.4,
        rz: 0.08,
        floatOffset: 3.8,
        floatSpeed: 0.4,
        rotSpeed: [0.002, 0.0018, 0.001],
      },
      // Paper right
      {
        type: 'paper',
        creator: () => createPaperSheet(1.5, 2.0, paperColors.antique),
        x: 2.2,
        y: 0.2,
        z: 0.2,
        rx: -0.08,
        ry: 0.35,
        rz: 0.02,
        floatOffset: 4.2,
        floatSpeed: 0.25,
        rotSpeed: [0.0006, 0.0022, 0.0004],
      },
      // Small card bottom left
      {
        type: 'card',
        creator: () => createCard(0.9, 1.4, paperColors.oatmeal),
        x: -1.8,
        y: -1.5,
        z: 0.8,
        rx: 0.25,
        ry: -0.15,
        rz: -0.1,
        floatOffset: 5.5,
        floatSpeed: 0.38,
        rotSpeed: [0.0015, 0.001, 0.0006],
      },
      // Pink sticky
      {
        type: 'sticky',
        creator: () => createStickyNote(0.55, accentColors.pinkSticky),
        x: 0.5,
        y: 1.8,
        z: -0.3,
        rx: 0.12,
        ry: 0.5,
        rz: 0.06,
        floatOffset: 6.0,
        floatSpeed: 0.42,
        rotSpeed: [0.0018, 0.0015, 0.0008],
      },
      // Notebook bottom right
      {
        type: 'notebook',
        creator: () => createNotebook(1.2, 1.6, paperColors.beige),
        x: 1.5,
        y: -1.3,
        z: -0.8,
        rx: -0.15,
        ry: 0.4,
        rz: -0.04,
        floatOffset: 1.5,
        floatSpeed: 0.3,
        rotSpeed: [0.001, 0.0018, 0.0004],
      },
      // Blue sticky
      {
        type: 'sticky',
        creator: () => createStickyNote(0.5, accentColors.blueSticky),
        x: -0.8,
        y: 1.5,
        z: 0.6,
        rx: 0.18,
        ry: -0.2,
        rz: 0.07,
        floatOffset: 7.0,
        floatSpeed: 0.45,
        rotSpeed: [0.002, 0.0012, 0.0009],
      },
      // Paper top left
      {
        type: 'paper',
        creator: () => createPaperSheet(1.3, 1.7, paperColors.warmWhite),
        x: -3.5,
        y: -0.8,
        z: 0.3,
        rx: 0.05,
        ry: -0.45,
        rz: 0.03,
        floatOffset: 2.0,
        floatSpeed: 0.27,
        rotSpeed: [0.0007, 0.002, 0.0005],
      },
    ];

    // Create all objects
    objectConfigs.forEach((config) => {
      const group = config.creator();
      group.position.set(config.x, config.y, config.z);
      group.rotation.set(config.rx, config.ry, config.rz);
      scene.add(group);

      objects.push({
        mesh: group as any,
        initialPosition: new THREE.Vector3(config.x, config.y, config.z),
        floatOffset: config.floatOffset,
        floatSpeed: config.floatSpeed,
        rotationSpeed: new THREE.Vector3(...config.rotSpeed),
        objectType: config.type,
      });
    });

    // Mouse tracking
    const mouse = new THREE.Vector2(0, 0);
    const targetMouse = new THREE.Vector2(0, 0);

    const handleMouseMove = (event: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      targetMouse.x = ((event.clientX - rect.left) / width) * 2 - 1;
      targetMouse.y = -((event.clientY - rect.top) / height) * 2 + 1;
    };

    container.addEventListener('mousemove', handleMouseMove);

    // Animation
    let time = 0;
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      time += 0.008;

      // Smooth mouse following
      mouse.x += (targetMouse.x - mouse.x) * 0.04;
      mouse.y += (targetMouse.y - mouse.y) * 0.04;

      // Animate each object
      objects.forEach((obj, i) => {
        const { mesh, initialPosition, floatOffset, floatSpeed, rotationSpeed } = obj;

        // Gentle floating motion
        const floatY = Math.sin(time * floatSpeed + floatOffset) * 0.2;
        const floatX = Math.cos(time * floatSpeed * 0.6 + floatOffset) * 0.12;
        const floatZ = Math.sin(time * floatSpeed * 0.4 + floatOffset) * 0.08;

        mesh.position.x = initialPosition.x + floatX + mouse.x * 0.4 * ((i % 3) - 1);
        mesh.position.y = initialPosition.y + floatY + mouse.y * 0.3 * ((i % 2) - 0.5);
        mesh.position.z = initialPosition.z + floatZ;

        // Gentle rotation
        mesh.rotation.x += rotationSpeed.x;
        mesh.rotation.y += rotationSpeed.y;
        mesh.rotation.z += rotationSpeed.z;

        // Subtle tilt based on mouse
        mesh.rotation.x += mouse.y * 0.03;
        mesh.rotation.y += mouse.x * 0.05;
      });

      // Subtle camera movement
      camera.position.x = mouse.x * 0.2;
      camera.position.y = mouse.y * 0.15;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };

    animate();

    // Handle resize
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Store refs for cleanup
    sceneRef.current = {
      scene,
      camera,
      renderer,
      objects,
      mouse,
      targetMouse,
    };

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (sceneRef.current?.renderer) {
        container.removeChild(sceneRef.current.renderer.domElement);
        sceneRef.current.renderer.dispose();
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden pointer-events-none"
      style={{ zIndex: 1 }}
    />
  );
};

export default FloatingPapers;
