'use client'

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

interface PortalProps {
  children: React.ReactNode;
  containerId?: string;
}

export const PortalContainer = (props: { portalId: string }) => {
  return <div id={props.portalId} />
}

export const Portal = Object.assign((props: PortalProps) => {
  const [mountNode, setMountNode] = useState<Element | null>(null);

  useEffect(() => {
    const container = props.containerId ? document.getElementById(props.containerId) : document.body
    // Use the provided container or default to document.body
    setMountNode(container || document.body);
  }, [props.containerId]);

  if (!mountNode) return null;
  // Only render the portal when we have a mount node
  return createPortal(props.children, mountNode);
}, {
  Container: PortalContainer,
})

console.log('Portal', Portal);


