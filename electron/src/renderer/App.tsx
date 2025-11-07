
// File: electron-react/src/renderer/App.tsx
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import { MemoryRouter as Router, Routes, Route } from 'react-router-dom';
// import {ElectronProviders} from '../../components/Providers';
import './App.css';


function Hello() {

//   const canvasRef = useRef<HTMLCanvasElement>(null);

// useEffect(() => {
//   const ctx = canvasRef.current!.getContext('2d')!;
//   const handleFrame = (data) => {
//     // draw field resonance data directly
//     ctx.clearRect(0, 0, w, h);
//     renderField(ctx, data);
//   };
//   window.signal.onFrame(handleFrame);
// }, []);
// setInterval(() => {
//   const data = getFYRSignalFrame(); // mock or live
//   mainWindow.webContents.send('frame', data);
// }, 16); // 60fps

  return (
    <div>
      <div className="Hello">
        {/* <img width="200" alt="icon" src={icon} /> */}
      </div>
      <div style={{ color: '#2f095dd8', fontFamily: 'monospace' }}>
            ⚡ VQuantum Electron Online
      </div> 
      <div className="Hello">
        <a
          href="https://electron-react-boilerplate.js.org/"
          target="_blank"
          rel="noreferrer"
        >
          <button type="button">
            <span role="img" aria-label="books">
              📚
            </span>
            Read our docs
          </button>
        </a>
        <a
          href="https://github.com/sponsors/electron-react-boilerplate"
          target="_blank"
          rel="noreferrer"
        >
          <button type="button">
            <span role="img" aria-label="folded hands">
              🙏
            </span>
            Donate
          </button>
        </a>
      </div>
    </div>
  );
}



const router = createBrowserRouter(
  [
      {
    path: '/',
    element:            
      <Hello />,  //<HomePage
    errorElement: <div>Something went wrong</div>,
  },
  // {
  //   path: '*',
  //   element: <></> //<NotFound />,
  // },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
);


export default function App() {
  return (
    // <RouterProvider router={router} />
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <Hello />
            }
        />
      </Routes>
    </Router>
  );
}




/* 
// apps/electron-react/src/renderer/App.tsx
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import "./App.css";

const router = createBrowserRouter(
  [
      {
    path: '/',
    element: <></>  //<HomePage />,
  },
  // {
  //   path: '*',
  //   element: <></> //<NotFound />,
  // },
  ],
  {
    future: {
      v7_startTransition: true,
      v7_relativeSplatPath: true,
    },
  }
);

export default function App() {
  return (
    // <Providers>
      <RouterProvider router={router} />
    // </Providers>
  );
}



*/