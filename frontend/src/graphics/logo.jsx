import React from 'react';

const ConnectEHRLogo = () => {
  return (
    <div style={styles.logoContainer}>
      <span style={styles.connect}>Connect</span>
      <span style={styles.ehr}>EHR</span>
    </div>
  );
};

const styles = {
  logoContainer: {
    fontFamily: `'Montserrat', sans-serif`,
    fontWeight: 700,
    fontSize: '2.0rem',
    display: 'flex',
    alignItems: 'center',
  },
  connect: {
    color: '#22689F', // deep healthcare blue
  },
  ehr: {
    color: '#46A1D5', // lighter turquoise/blue
    marginLeft: '4px',
  },
};

export default ConnectEHRLogo;
