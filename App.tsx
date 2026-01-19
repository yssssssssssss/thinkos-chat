import React, { useEffect } from 'react';
// import Canvas from './Canvas';
// import ChatDemo from './ChatDemo'; // 旧版本
import ChatView from './src/chat/ChatView'; // 重构后的版本
import { SkillService } from './src/services/skillService';
import Workspace from './src/workspace/Workspace';

function App() {
  // 应用启动时初始化 Skills
  useEffect(() => {
    SkillService.initialize();
  }, []);

  return (
    <div className="bg-white text-black h-screen w-screen">
      {/* <Canvas /> */}
      <Workspace />
    </div>
  );
}

export default App;
