import ChatWindow from "./components/ChatWindow";

export default function App() {
  return (
    <>
      <div className="bg-mesh" aria-hidden="true">
        <span className="b1" />
        <span className="b2" />
        <span className="b3" />
        <span className="b4" />
      </div>
      <ChatWindow />
    </>
  );
}
