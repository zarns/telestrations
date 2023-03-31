import Link from 'next/link';
import Layout from '../components/Layout';
import Game from '../components/Game';

const IndexPage = () => (
  <Layout title="Telestrations">
    <div
      className="bg-cover bg-center h-screen"
      style={{
        backgroundImage: "url(../whiteboard_background.jpg)",
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    >
      <div className="flex flex-col items-center justify-center h-full">
        <div className="bg-white p-6 rounded-lg shadow-lg">
          <Game />
        </div>
      </div>
    </div>
  </Layout>
);

export default IndexPage;
