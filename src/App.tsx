import Editor from "./components/Editor";
import Player from "./components/Player";
import { useStudioStore } from "./store/studioStore";
import { Agentation } from "agentation";

const App = () => {
  const mode = useStudioStore((state) => state.mode);

  return (
    <div className="app">
      {mode === "editor" ? <Editor /> : <Player />}
           <Agentation />
    </div>
  );
};

export default App;
