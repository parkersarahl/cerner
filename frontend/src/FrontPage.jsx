import { useNavigate } from 'react-router-dom';
import cernerLogo from './graphics/Cerner.png';
import epicLogo from './graphics/Epic.png';
import appLogo from './graphics/ConnectEHR_logo.png';

const FrontPage = () => {
  const navigate = useNavigate();

  return (
    <>
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-14">
      <img
        src={appLogo}
        alt="ConnectEHR Logo"
        className="w-100 h-60 object-contain mb-1 mx-auto"
      />
      <h1 className="text-xl font-semibold text-gray-700 mb-10 text-center border-b-2 border-gray-300 pb-">
        Uniting Records. Empowering Care.
      </h1>

      <div className="flex flex-row items-center space-x-16 mt-4 justify-center">
        <button
          onClick={() => navigate('/search/cerner')}
          className="flex items-center justify-center bg-white shadow-lg rounded-lg p-4 hover:shadow-xl transition w-22 h-22"
          aria-label="Go to Cerner patient search"
        >
          <img
            src={cernerLogo}
            alt="Cerner"
            className="w-20 h-20 object-contain"
          />
        </button>

        <button
          onClick={() => navigate('/epic-login')}
          className="flex items-center justify-center bg-white shadow-lg rounded-lg p-4 hover:shadow-xl transition w-22 h-22"
          aria-label="Go to Epic patient search"
        >
          <img
            src={epicLogo}
            alt="Epic"
            className="w-20 h-20 object-contain"
          />
        </button>
      </div>
    </div>
    </>
  );
};

export default FrontPage;
