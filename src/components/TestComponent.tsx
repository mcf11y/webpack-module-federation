import css from './TestComponent.module.scss';
import { useState } from 'react';

const TestComponent = () => {
  const [someState, setSomeState] = useState<number>(0);

  return (
    <a
      className={css.root}
      onClick={() => {
        console.log('STATE', someState);
        setSomeState((prev) => prev + 1);
      }}
      href='tel:8 999 999-9999'
    >
      8 999 999-9999
    </a>
  );
};

export default TestComponent;
