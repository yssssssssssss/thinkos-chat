import React from 'react';

import { WorkspaceProvider } from './WorkspaceContext';
import WorkspaceLayout from './WorkspaceLayout';

const Workspace: React.FC = () => {
  return (
    <WorkspaceProvider>
      <WorkspaceLayout />
    </WorkspaceProvider>
  );
};

export default Workspace;

