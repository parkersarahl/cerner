import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const PatientDetail = () => {
  const { patientId } = useParams();
  const [reports, setReports] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
const fetchResources = async () => {
  try {
    setError('');
    const [diagnostic] = await Promise.all([
      axios.get(`/api/cerner/diagnostic-reports/radiology?patient=${patientId}`),
    ]);
    
    console.log('Diagnostic Reports:', diagnostic.data);

    const getResources = (bundle) =>
      bundle?.entry?.map((e) => e.resource) || [];

    setReports(getResources(diagnostic.data));

  } catch (err) {
    setError('Failed to load patient resources');
    console.error(err);
  }
};

  fetchResources();
}, [patientId]);

const handleResourceClick = (report) => {
  const form = report?.presentedForm?.[0];

  if (form?.url) {
    const url = new URL(form.url);
    const binaryId = url.pathname.split('/').pop(); // e.g., "XR-197369077"
    window.open(`http://localhost:8000/api/cerner/binary/${binaryId}`, '_blank');
  } else if (form?.data) {
    const blob = new Blob([atob(form.data)], {
      type: form.contentType || '*/*',
    });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, '_blank');
  } else {
    setError('No report file available for this resource.');
  }
};


  const renderItem = (item, type) => {
  const id = item.id;
  if (!id) return null;

  const label =
    item.code?.text || item.code?.coding?.[0]?.display || item.title || `${type} resource`;

  const date = item.issued ? new Date(item.issued).toLocaleDateString() : '';

  return (
    <li key={`${type}-${id}`} className="my-1">
      <button
        onClick={() => handleResourceClick(item)}
      className="text-blue-600 hover:underline focus:outline-none"
    >
      {label} ({date})
    </button>
    </li>
  );
};

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Patient Details</h2>
      {error && <p className="text-red-600">{error}</p>}

      <section className="mb-4">
        <h3 className="text-lg font-medium">Diagnostic Reports</h3>
        <ul className="list-disc ml-6">
          {reports.map((r) => renderItem(r, 'DiagnosticReport'))}
        </ul>
      </section>
    </div>
  );
};

export default PatientDetail;

