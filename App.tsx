import React from 'react';
// import Canvas from './Canvas';
// import ChatDemo from './ChatDemo'; // 旧版本
import ChatView from './src/chat/ChatView'; // 重构后的版本

function App() {
  return (
    <div className="bg-white text-black h-screen w-screen">
      {/* <Canvas /> */}
      <ChatView />
    </div>
  );
}

export default App;
