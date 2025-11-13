// Type declarations to fix React 18/19 compatibility with @react-email/components
declare module '@react-email/components' {
  import { ComponentType, ReactNode } from 'react';

  export interface BaseProps {
    children?: ReactNode;
    style?: React.CSSProperties;
  }

  export const Html: ComponentType<any>;
  export const Head: ComponentType<any>;
  export const Preview: ComponentType<{ children?: ReactNode }>;
  export const Body: ComponentType<any>;
  export const Container: ComponentType<any>;
  export const Heading: ComponentType<any>;
  export const Text: ComponentType<any>;
  export const Section: ComponentType<any>;
  export const Button: ComponentType<any>;
  export const Hr: ComponentType<any>;
  export const Link: ComponentType<any>;
  export const Img: ComponentType<any>;
  export const Row: ComponentType<any>;
  export const Column: ComponentType<any>;
}
