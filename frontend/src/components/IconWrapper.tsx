import React from 'react';
import { IconBaseProps, IconType } from 'react-icons';

interface IconWrapperProps extends IconBaseProps {
  icon: IconType;
}

// Cast the icon as any to bypass TypeScript's type checking
const IconWrapper: React.FC<IconWrapperProps> = ({ icon: Icon, ...props }) => {
  return <>{(Icon as any)(props)}</>;
};

export default IconWrapper; 