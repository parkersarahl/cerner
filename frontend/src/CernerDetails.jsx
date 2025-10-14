import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const CernerPatientDetails = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();

  const [patient, setPatient] = useState(null);
  const [radiology, setRadiology] = useState([]);
  const [labs, setLabs] = useState([]);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const ALLOWED_ACCEPTS = [
    'application/pdf',
    'image/jpeg',
    'application/dicom',
    'application/fhir+xml',
    'application/fhir+json',
    'application/json',
    'text/plain',
    'application/octet-stream',
    'application/xml',
    '*/*',
  ];

  useEffect(() => {
    const fetchPatientData = async () => {
      try {
        const ehrSource = localStorage.getItem("ehrSource");
        const token = localStorage.getItem("cernerToken");

        if (!ehrSource || ehrSource !== "cerner") {
          console.warn("EHR source not set or not Cerner — redirecting...");
          navigate("/frontpage", { replace: true });
          return;
        }

        if (!token) {
          console.error("Missing Cerner token — redirecting...");
          navigate("/cerner/login", { replace: true });
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };
        const baseUrl = process.env.REACT_APP_API_URL;

        // Fetch all resources in parallel
        const [patientRes, radiologyRes, labRes, notesRes] = await Promise.all([
          axios.get(`${baseUrl}/cerner/patient/${patientId}`, { headers }),
          axios.get(`${baseUrl}/cerner/diagnostic-reports/radiology?patient=${patientId}`, { headers }),
          axios.get(`${baseUrl}/cerner/diagnostic-reports/labs?patient=${patientId}`, { headers }),
          axios.get(`${baseUrl}/cerner/document-references/clinical?patient=${patientId}`, { headers })
        ]);

        console.log("Patient Response:", patientRes.data);
        console.log("Radiology Response:", radiologyRes.data);
        console.log("Lab Response:", labRes.data);
        console.log("Notes Response:", notesRes.data);

        setPatient(patientRes.data);
        setRadiology(radiologyRes.data.entry || []);
        setLabs(labRes.data.entry || []);
        setNotes(notesRes.data.entry || []);

        setLoading(false);
      } catch (err) {
        console.error("Error fetching Cerner patient details:", err);
        setError("Failed to load patient data. Please try again.");
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [patientId, navigate]);

  const handleResourceClick = async (resource) => {
    if (!resource) {
      setError("No report data available for this item.");
      return;
    }

    let attachment = null;

    // Check for DocumentReference content or DiagnosticReport presentedForm
    if (resource.content && resource.content.length > 0) {
      attachment = resource.content[0].attachment;
    } else if (resource.presentedForm && resource.presentedForm.length > 0) {
      attachment = resource.presentedForm[0];
    }

    if (!attachment) {
      setError("No report file available for this resource.");
      return;
    }

    let url = attachment.url;
    let contentType = attachment.contentType || "application/pdf";

    if (!url) {
      setError("No report file URL available for this resource.");
      return;
    }

    // Validate content type
    if (!ALLOWED_ACCEPTS.includes(contentType)) {
      contentType = "application/pdf";
    }

    const baseUrl = process.env.REACT_APP_API_URL;
    const isAbsoluteUrl = url.startsWith("http://") || url.startsWith("https://");

    // Extract binary ID from URL if needed
    let binaryId = url;
    if (isAbsoluteUrl) {
      const parts = url.split("/");
      binaryId = parts[parts.length - 1];
    }

    // Build final URL
    const finalUrl = isAbsoluteUrl 
      ? url 
      : `${baseUrl}/cerner/binary/${binaryId}`;

    try {
      const token = localStorage.getItem("cernerToken");
      const response = await axios.get(finalUrl, {
        responseType: "blob",
        headers: {
          Accept: contentType,
          Authorization: `Bearer ${token}`,
        },
      });

      const blob = new Blob([response.data], { type: contentType });
      const blobUrl = URL.createObjectURL(blob);
      window.open(blobUrl, "_blank");
    } catch (err) {
      setError(`Failed to open report file: ${err.response?.status || err.message}`);
      console.error("Binary fetch error:", err);
    }
  };

  const renderResourceItem = (entry, type) => {
    const resource = entry.resource;
    if (!resource) return null;

    const id = resource.id;
    const label = 
      resource.code?.text ||
      resource.type?.text ||
      resource.type?.coding?.[0]?.display ||
      resource.title ||
      `${type} resource`;

    const date = resource.effectiveDateTime || resource.date || resource.issued;
    const formattedDate = date 
      ? new Date(date).toLocaleDateString('en-US')
      : 'N/A';

    const status = resource.status;

    return (
      <li key={`${type}-${id}`} className="border-b border-gray-200 pb-2 mb-2">
        <button
          onClick={() => handleResourceClick(resource)}
          className="text-blue-600 hover:text-blue-800 hover:underline focus:outline-none text-left w-full"
        >
          <div className="font-semibold">{label}</div>
          <div className="text-sm text-gray-600">
            Date: {formattedDate} {status && `• Status: ${status}`}
          </div>
        </button>
      </li>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-blue-500"></div>
        <p className="ml-4 text-gray-600 text-lg">Loading patient data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center">
        <div className="text-red-600 mb-4">{error}</div>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">
          Cerner Patient Details
        </h1>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Back
        </button>
      </div>

      {/* Patient Demographics */}
      {patient && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-3">Patient Information</h2>
          <div className="space-y-2">
            <p className="text-gray-800">
              <strong>Name:</strong>{' '}
              {patient.name?.[0]?.text || 
               `${patient.name?.[0]?.given?.join(' ')} ${patient.name?.[0]?.family}` || 
               'N/A'}
            </p>
            <p className="text-gray-800">
              <strong>Gender:</strong> {patient.gender || 'N/A'}
            </p>
            <p className="text-gray-800">
              <strong>Birth Date:</strong>{' '}
              {patient.birthDate 
                ? new Date(patient.birthDate).toLocaleDateString('en-US')
                : 'N/A'}
            </p>
            <p className="text-gray-800">
              <strong>ID:</strong> {patient.id || 'N/A'}
            </p>
          </div>
        </div>
      )}

      {/* Radiology Reports */}
      <section className="bg-white shadow rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Radiology Reports</h3>
        {radiology.length > 0 ? (
          <ul className="space-y-1">
            {radiology.map((entry) => renderResourceItem(entry, 'Radiology'))}
          </ul>
        ) : (
          <p className="text-gray-500">No radiology reports found.</p>
        )}
      </section>

      {/* Lab Reports */}
      <section className="bg-white shadow rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Lab Reports</h3>
        {labs.length > 0 ? (
          <ul className="space-y-1">
            {labs.map((entry) => renderResourceItem(entry, 'Lab'))}
          </ul>
        ) : (
          <p className="text-gray-500">No lab reports found.</p>
        )}
      </section>

      {/* Clinical Notes */}
      <section className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Clinical Notes</h3>
        {notes.length > 0 ? (
          <ul className="space-y-1">
            {notes.map((entry) => renderResourceItem(entry, 'Clinical Note'))}
          </ul>
        ) : (
          <p className="text-gray-500">No clinical notes found.</p>
        )}
      </section>
    </div>
  );
};

export default CernerPatientDetails;