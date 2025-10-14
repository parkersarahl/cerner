import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const REACT_APP_API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const EpicDetails = () => {
  const { patientId } = useParams();
  const navigate = useNavigate();
  
  const [radiologyReports, setRadiologyReports] = useState([]);
  const [clinicalNotes, setClinicalNotes] = useState([]);
  const [labReports, setLabReports] = useState([]);
  const [patient, setPatient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

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
    const fetchResources = async () => {
      setIsLoading(true);
      try {
        setError('');
        const token = localStorage.getItem('epic_token');

        if (!token) {
          console.error("Missing Epic token");
          navigate("/epic/login", { replace: true });
          return;
        }

        const config = {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        };

        const [radiologyRes, labRes, notesRes, patientRes] = await Promise.all([
          axios.get(`${REACT_APP_API_URL}/epic/documentReferences?patientId=${patientId}&type=radiology`, config),
          axios.get(`${REACT_APP_API_URL}/epic/documentReferences?patientId=${patientId}&type=lab`, config),
          axios.get(`${REACT_APP_API_URL}/epic/documentReferences?patientId=${patientId}&type=clinical`, config),
          axios.get(`${REACT_APP_API_URL}/epic/patient/${patientId}`, config),
        ]);

        const getResources = (bundle) => bundle?.entry?.map((e) => e.resource) || [];

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
  }, [patientId, navigate]);

  const handleResourceClick = async (report) => {
    console.log("=== CLICKED RESOURCE ===");
    console.log("Full resource:", JSON.stringify(report, null, 2));
    
    if (!report) {
      setError("No report data available for this item.");
      return;
    }

    let attachment = null;

    if (report.content && report.content.length > 0) {
      attachment = report.content[0].attachment;
      console.log("Found attachment in content[0]");
    } else if (report.presentedForm && report.presentedForm.length > 0) {
      attachment = report.presentedForm[0];
      console.log("Found attachment in presentedForm[0]");
    }

    if (!attachment) {
      console.error("No attachment found!");
      alert(`No attachment found in resource.\n\nAvailable fields: ${Object.keys(report).join(', ')}`);
      setError("No report file available for this resource.");
      return;
    }

    console.log("Attachment:", attachment);
    console.log("Has 'data' field?", !!attachment.data);
    console.log("Has 'url' field?", !!attachment.url);

    // CHECK FOR INLINE BASE64 DATA FIRST
    if (attachment.data) {
      console.log("✅ Found inline base64 data! Length:", attachment.data.length);
      try {
        const contentType = attachment.contentType || "application/pdf";
        const base64Data = attachment.data;
        
        // Decode base64 to binary
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: contentType });
        const blobUrl = URL.createObjectURL(blob);
        
        console.log("✅ Successfully created blob from inline data");
        window.open(blobUrl, "_blank");
        return;
      } catch (err) {
        console.error("❌ Error decoding inline base64 data:", err);
        setError("Failed to decode document content.");
        return;
      }
    }

    // IF NO INLINE DATA, TRY FETCHING FROM URL
    let url = attachment.url;
    let contentType = attachment.contentType || "application/pdf";
    
    if (!url) {
      console.error("No URL found in attachment");
      setError("No report file URL available for this resource.");
      return;
    }

    console.log("Attempting to fetch from URL:", url);

    if (!ALLOWED_ACCEPTS.includes(contentType)) {
      contentType = "application/pdf";
    }

    const isAbsoluteUrl = url.startsWith("http://") || url.startsWith("https://");

    let binaryId = url;
    if (isAbsoluteUrl) {
      const parts = url.split("/");
      binaryId = parts[parts.length - 1];
    }

    if (binaryId.startsWith("Binary/")) {
      binaryId = binaryId.replace("Binary/", "");
    }

    const finalUrl = isAbsoluteUrl 
      ? url 
      : `${REACT_APP_API_URL}/epic/binary/${binaryId}`;

    console.log("Final URL:", finalUrl);

    try {
      const token = localStorage.getItem("epic_token");
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
      console.error("❌ Binary fetch failed:", err);
      
      const errorMsg = err.response?.status === 403 
        ? "⚠️ Epic's sandbox restricts access to Binary resources. This is a known limitation - the document reference exists but Epic won't let us retrieve the actual file in the test environment."
        : `Failed to open report file: ${err.response?.status || err.message}`;
      
      setError(errorMsg);
      alert(`Could not open document\n\n${errorMsg}\n\nDocument info:\n- Title: ${attachment.title || 'N/A'}\n- Type: ${attachment.contentType || 'N/A'}`);
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
          {label} {formattedDate && `(${formattedDate})`}
        </button>
      </li>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-green-500 border-solid"></div>
        <p className="text-gray-600 text-lg ml-4">Loading patient data...</p>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Epic Patient Details</h2>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Back
        </button>
      </div>
      
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
      
      {error && <p className="text-red-600 mb-4">{error}</p>}

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

export default EpicDetails;