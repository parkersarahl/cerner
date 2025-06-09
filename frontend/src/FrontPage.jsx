import { useNavigate } from 'react-router-dom';
import cernerLogo from './graphics/Cerner.png';
import epicLogo from './graphics/Epic.png';
import appLogo from './graphics/ConnectEHR_logo.png';

const FrontPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <img
        src={appLogo}
        alt="ConnectEHR Logo"
        className="w-32 h-32 object-contain mb-2 mx-auto"
      />
      <h1 className="text-xl font-semibold text-red-700 mb-10 text-center border-b-2 border-gray-300 pb-2">
        Connecting EHRs Seamlessly Across Systems
      </h1>

      <div className="flex flex-row items-center space-x-8 mt-4 justify-center">
        <button
          onClick={() => navigate('/search/cerner')}
          className="flex items-center justify-center bg-white shadow-lg rounded-lg p-2 hover:shadow-xl transition w-14 h-14"
          aria-label="Go to Cerner patient search"
        >
          <img
            src={cernerLogo}
            alt="Cerner"
            style = {{ width: '100px', height: '100px' }}
            className="object-contain"
          />
        </button>

        <button
          onClick={() => navigate('/search/epic')}
          className="flex items-center justify-center bg-white shadow-lg rounded-lg p-2 hover:shadow-xl transition w-14 h-14"
          aria-label="Go to Epic patient search"
        >
          <img
            src={epicLogo}
            alt="Epic"
            style = {{ width: '100px', height: '100px' }}
            className="w-8 h-8 object-contain"
          />
        </button>
      </div>
    </div>
  );
};

export default FrontPage;
