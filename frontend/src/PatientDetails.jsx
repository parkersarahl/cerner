import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const PatientDetail = () => {
  const { patientId } = useParams();
  const [radiologyReports, setRadiologyReports] = useState([]);
  const [labReports, setLabReports] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResources = async () => {
      try {
        setError('');

        const [radiologyRes, labRes] = await Promise.all([
          axios.get(`/api/cerner/diagnostic-reports/radiology?patient=${patientId}`),
          axios.get(`/api/cerner/diagnostic-reports/labs?patient=${patientId}`),
        ]);
      
        const getResources = (bundle) =>
          bundle?.entry?.map((e) => e.resource) || [];

        setRadiologyReports(getResources(radiologyRes.data));
        setLabReports(getResources(labRes.data));

      } catch (err) {
        setError('Failed to load patient resources');
        console.error(err);
      }
    };

    fetchResources();
  }, [patientId]);
  
const ALLOWED_ACCEPTS = [
  "application/pdf",
  "image/jpeg",
  "application/dicom",
  "application/fhir+xml",
  "application/fhir+json",
  "*/*",
];

const handleResourceClick = (report) => {
  const form = report?.presentedForm?.[0];

  if (form?.url) {
    const url = new URL(form.url);
    const binaryId = url.pathname.split('/').pop();
    let contentType = form.contentType || 'application/pdf';

    // sanitize accept header to allowed types only
    if (!ALLOWED_ACCEPTS.includes(contentType)) {
      contentType = 'application/pdf';
    }

    window.open(
      `http://localhost:8000/api/cerner/binary/${binaryId}?accept=${encodeURIComponent(contentType)}`,
      '_blank'
    );
  } else if (form?.data) {
    // ... your existing blob handling code
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

      <section className="mb-6">
        <h3 className="text-lg font-medium">Radiology Reports</h3>
        <ul className="list-disc ml-6">
          {radiologyReports.map((r) => renderItem(r, 'RadiologyReport'))}
        </ul>
      </section>

      <section className="mb-6">
        <h3 className="text-lg font-medium">Lab Reports</h3>
        <ul className="list-disc ml-6">
          {labReports.map((r) => renderItem(r, 'LabReport'))}
        </ul>
      </section>
    </div>
  );
};

export default PatientDetail;
