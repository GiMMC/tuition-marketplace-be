"use client";

import dynamic from 'next/dynamic';
import 'swagger-ui-react/swagger-ui.css';

const SwaggerUI = dynamic(() => import('swagger-ui-react'), { ssr: false });

export default function ApiDocs() {
  return (
    <div className="h-screen w-screen overflow-auto bg-white">
      <SwaggerUI url="/api/swagger" />
    </div>
  );
}
