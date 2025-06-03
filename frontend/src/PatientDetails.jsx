import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const PatientDetail = () => {
  const { patientId } = useParams();
  const [reports, setReports] = useState([]);
  const [selectedResource, setSelectedResource] = useState(null);
  const [error, setError] = useState('');

  const FHIR_BASE_URL = 'https://fhir-open.cerner.com/r4/ec2458f2-1e24-41c8-b71b-0e701af7583d';

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

  const handleResourceClick = async (type, id) => {
    const url = `${FHIR_BASE_URL}/${type}/${id}`;
    try {
      const resp = await axios.get(url, {
        headers: { Accept: 'application/fhir+json' },
      });
      setSelectedResource(resp.data);
    } catch (err) {
      setError('Failed to load full resource');
      console.error(err);
    }
  };

  const renderItem = (item, type) => {
  const id = item.id;
  if (!id) return null;

  const label =
    item.code?.text || item.type?.[0]?.text || item.title || `${type} resource`;

  return (
    <li key={`${type}-${id}`} className="my-1">
      <button
        onClick={() => handleResourceClick(type, id)}
        className="text-blue-600 hover:underline focus:outline-none"
      >
        {label}
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

      {selectedResource && (
        <div className="mt-6 bg-gray-100 p-4 rounded shadow overflow-x-auto max-h-[500px]">
          <h4 className="text-md font-semibold mb-2">Resource JSON</h4>
          <pre className="text-sm whitespace-pre-wrap">
            {JSON.stringify(selectedResource, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default PatientDetail;
