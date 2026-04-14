// 全局类型声明

declare module '*.tsx' {
  import React from 'react';
  export default React.Component;
}

declare module '*.ts' {
  export * from '*.ts';
}

// 修复JSX类型
declare namespace JSX {
  interface IntrinsicElements {
    [elemName: string]: any;
  }
}

// 声明全局变量
declare const process: {
  env: {
    NODE_ENV: string;
  };
};