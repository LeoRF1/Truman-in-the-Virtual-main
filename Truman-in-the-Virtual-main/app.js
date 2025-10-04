// Skybox Component
function SkyboxScene() {
  const mountRef = React.useRef(null);

  React.useEffect(() => {
    // ===== Scene Setup =====
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    // ===== Controls =====
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.enablePan = false; // Disable panning to avoid conflicts
    controls.enableZoom = true; // Keep zoom enabled
    controls.enableRotate = true; // Keep rotation enabled

    // ===== Multi-Skybox System =====
    const loader = new THREE.CubeTextureLoader();
    let currentPosition = 0;
    let isTransitioning = false;
    let lastClickTime = 0;
    let clickCount = 0;
    const hotspots = []; // Array to store interactive objects

// Define skybox positions (you can add more positions here)
const skyboxPositions = [
  {
    name: "Position 1",
    images: [
      "posx.jpg", "negx.jpg",
      "posy.jpg", "negy.jpg", 
      "posz.jpg", "negz.jpg"
    ]
  },
  {
    name: "Position 2 (5m ahead)",
    images: [
      "posx2.jpg", "negx2.jpg",
      "posy2.jpg", "negy2.jpg",
      "posz2.jpg", "negz2.jpg"
    ]
  }
];

// Load skybox function
const loadSkybox = (positionIndex) => {
  if (positionIndex >= skyboxPositions.length) {
    console.log("No more positions available");
    return;
  }
  
  const position = skyboxPositions[positionIndex];
  console.log(`Loading skybox: ${position.name}`);
  
  const skyboxTexture = loader.load(position.images);
  scene.background = skyboxTexture;
};

// Load the first skybox
loadSkybox(currentPosition);

    // ===== Lighting =====
    const light = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(light);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(0, 1, 1);
    scene.add(directionalLight);

    // ===== Forward Arrow Setup =====
    let forwardArrow = null;
    
    // Create forward arrow (Google Maps style)
    const createForwardArrow = () => {
      // Create arrow geometry
      const arrowShape = new THREE.Shape();
      arrowShape.moveTo(-0.3, -0.2);
      arrowShape.lineTo(0.3, -0.2);
      arrowShape.lineTo(0.3, -0.1);
      arrowShape.lineTo(0.5, 0);
      arrowShape.lineTo(0.3, 0.1);
      arrowShape.lineTo(0.3, 0.2);
      arrowShape.lineTo(-0.3, 0.2);
      arrowShape.lineTo(-0.3, 0.1);
      arrowShape.lineTo(-0.1, 0);
      arrowShape.lineTo(-0.3, -0.1);
      arrowShape.lineTo(-0.3, -0.2);
      
      const arrowGeometry = new THREE.ShapeGeometry(arrowShape);
      const arrowMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffffff,
        transparent: true,
        opacity: 0.8
      });
      
      forwardArrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
      forwardArrow.position.set(0, -1.5, 2); // Position at bottom center, slightly forward
      forwardArrow.scale.set(0.5, 0.5, 0.5);
      scene.add(forwardArrow);
      
      // Add to hotspots for click detection
      hotspots.push(forwardArrow);
    };
    
    // Create the arrow
    createForwardArrow();

    // ===== Raycaster for Arrow Detection =====
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // ===== Click Handler =====
    function onClick(event) {
      // Get the canvas rect to calculate relative coordinates
      const rect = renderer.domElement.getBoundingClientRect();
      const clickY = (event.clientY - rect.top) / rect.height;
      const clickX = (event.clientX - rect.left) / rect.width;
      
      // Convert mouse position to normalized device coordinates
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      
      // Check for arrow click using raycasting
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(hotspots);
      
      if (intersects.length > 0) {
        console.log("Arrow clicked! Moving to next position...");
        event.preventDefault();
        event.stopPropagation();
        
        if (currentPosition < skyboxPositions.length - 1) {
          currentPosition++;
          loadSkybox(currentPosition);
        }
        return;
      }
      
      // Fallback: Double-click navigation in bottom area
      const currentTime = Date.now();
      
      if (currentTime - lastClickTime < 300) {
        clickCount++;
        if (clickCount === 1) { // This is the second click
          event.preventDefault();
          event.stopPropagation();
          
          if (clickY > 0.5) { // Bottom half of screen
            if (clickX < 0.5) { // Left side - go forward
              console.log("Double click detected! Moving FORWARD...");
              if (currentPosition < skyboxPositions.length - 1) {
                currentPosition++;
                loadSkybox(currentPosition);
              }
            } else { // Right side - go backward
              console.log("Double click detected! Moving BACKWARD...");
              if (currentPosition > 0) {
                currentPosition--;
                loadSkybox(currentPosition);
              }
            }
          }
          clickCount = 0; // Reset counter
        }
      } else {
        clickCount = 1; // First click
      }
      
      lastClickTime = currentTime;
      
      // Reset click count after a delay
      setTimeout(() => {
        clickCount = 0;
      }, 300);
    }

    // Add click listener to the renderer's canvas element
    renderer.domElement.addEventListener("click", onClick, true); // Use capture phase

    // ===== Animation Loop =====
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // ===== Handle Resize =====
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    // ===== Cleanup =====
    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("click", onClick);
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0" />;
}

  
  // Main App Component
  function App() {
    return (
      <div className="relative h-full w-full overflow-hidden">
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <h1 className="text-4xl font-bold mb-4">SkyScape Voyager</h1>
        </div>
        <SkyboxScene />
        <div className="absolute bottom-4 left-4 bg-gray-800 bg-opacity-70 p-4 rounded-lg">
          <p className="text-sm">Use mouse to navigate the 3D environment</p>
          <p className="text-xs mt-2 text-gray-400">
            Click the arrow at the bottom to go forward • Double-click bottom area for navigation
          </p>
        </div>
      </div>
    );
  }
  
  // Render App
  const rootElement = document.getElementById("root");
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
  