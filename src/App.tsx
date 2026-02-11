import Editor from "./components/Editor";
import Player from "./components/Player";
import { useStudioStore } from "./store/studioStore";

const App = () => {
  const mode = useStudioStore((state) => state.mode);

  return (
    <div className="app">{mode === "editor" ? <Editor /> : <Player />}</div>
  );
};

export default App;
