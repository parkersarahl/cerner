import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const PatientDetail = () => {
  const { patientId } = useParams();
  const [radiologyReports, setRadiologyReports] = useState([]);
  const [clinicalNotes, setClinicalNotes] = useState([]);
  const [labReports, setLabReports] = useState([]);
  const [patient, setPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchResources = async () => {
      setIsLoading(true);
      try {
        setError('');

        const isEpicMock = patientId.startsWith('mock-');

        const [radiologyRes, labRes, notesRes, patientRes] = await Promise.all([
          axios.get(
            isEpicMock
              ? `/api/epic/documentReferences?patientId=${patientId}&type=radiology`
              : `/api/cerner/diagnostic-reports/radiology?patient=${patientId}`
          ),
          axios.get(
            isEpicMock
              ? `/api/epic/documentReferences?patientId=${patientId}&type=lab`
              : `/api/cerner/diagnostic-reports/labs?patient=${patientId}`
          ),
          axios.get(
            isEpicMock
              ? `/api/epic/documentReferences?patientId=${patientId}&type=clinical`
              : `/api/cerner/diagnostic-reports/clinical?patient=${patientId}`
        ),  
          axios.get(
            isEpicMock
              ? `/api/epic/patient/${patientId}`
              : `/api/cerner/patient/${patientId}`
          ),
        ]);


        const getResources = (bundle) =>
          bundle?.entry?.map((e) => e.resource) || [];

        setClinicalNotes(getResources(notesRes.data));
        setRadiologyReports(getResources(radiologyRes.data));
        setLabReports(getResources(labRes.data));
        setPatient(patientRes.data);
      } catch (err) {
        setError('Failed to load patient resources');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResources();
  }, [patientId]);

  const ALLOWED_ACCEPTS = [
    'application/pdf',
    'image/jpeg',
    'application/dicom',
    'application/fhir+xml',
    'application/fhir+json',
    '*/*',
  ];

  const handleResourceClick = async (report) => {
  if (!report) {
    setError("No report data available for this item.");
    return;
  }

  let attachment = null;

  if (report.content && report.content.length > 0) {
    attachment = report.content[0].attachment;
  } else if (report.presentedForm && report.presentedForm.length > 0) {
    attachment = report.presentedForm[0];
  }

  if (!attachment) {
    setError("No report file available for this resource.");
    return;
  }

  const url = attachment.url;
  let contentType = attachment.contentType || "application/pdf";

  if (!url) {
    setError("No report file URL available for this resource.");
    return;
  }

  if (!ALLOWED_ACCEPTS.includes(contentType)) {
    contentType = "application/pdf";
  }

  const isEpicMock = patientId.startsWith("mock-");
  const isAbsoluteUrl = url.startsWith("http://") || url.startsWith("https://");

  const finalUrl = isAbsoluteUrl
    ? url
    : isEpicMock
    ? `/api/epic/binary/${url}`
    : `/api/cerner/binary/${url}`;

  try {
    const response = await axios.get(finalUrl, {
      responseType: "blob",
      headers: {
        Accept: contentType,
      },
    });

    const blob = new Blob([response.data], { type: contentType });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank");
  } catch (err) {
    setError("Failed to open report file.");
    console.error(err);
  }
};



  const renderItem = (item, type) => {
    const id = item.id;
    if (!id) return null;

    const label =
      item.type?.text ||
      item.type?.coding?.[0]?.display ||
      item.title ||
      `${type} resource`;

    const date = item.date || item.issued;
    const formattedDate = date
      ? new Date(date).toLocaleDateString('en-US')
      : '';

    return (
      <li key={`${type}-${id}`} className="my-1">
        <button
          onClick={() => handleResourceClick(item)}
          className="text-blue-600 hover:underline focus:outline-none"
        >
          {label} ({formattedDate})
        </button>
      </li>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500 border-solid"></div>
        <p className="text-gray-600 text-lg">Loading patient data...</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Patient Details</h2>
      {patient && (
        <div className="mb-4">
          <p className="text-lg">
            <strong>Name:</strong> {patient.name?.[0]?.given?.join(' ')} {patient.name?.[0]?.family}
          </p>
          <p className="text-lg">
            <strong>Date of Birth:</strong> {new Date(patient.birthDate).toLocaleDateString('en-US')}
          </p>
        </div>
    )}
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
      
      <section className="mb-6">
        <h3 className="text-lg font-medium">Clinical Notes</h3>
        <ul className="list-disc ml-6">
          {clinicalNotes.map((r) => renderItem(r, 'ClinicalNote'))}
        </ul>
      </section>
    </div>
  );
};

export default PatientDetail;
