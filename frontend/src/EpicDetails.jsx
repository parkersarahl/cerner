import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const EpicPatientDetails = () => {
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
        const token = localStorage.getItem("epic_token"); // FIXED: Use epic_token instead of token

        console.log("Epic Patient Details - Patient ID:", patientId);
        console.log("Token exists:", !!token);

        if (!token) {
          console.error("Missing Epic token — redirecting...");
          navigate("/epic/login", { replace: true });
          return;
        }

        const headers = { Authorization: `Bearer ${token}` };
        const baseUrl = process.env.REACT_APP_API_URL;

        console.log("Making requests with token:", token ? "Token exists" : "No token");
        console.log("Base URL:", baseUrl);

        // Fetch all resources in parallel
        const [patientRes, radiologyRes, labRes, notesRes] = await Promise.all([
          axios.get(`${baseUrl}/epic/patient/${patientId}`, { headers }),
          axios.get(`${baseUrl}/epic/documentReferences?patientId=${patientId}&type=radiology`, { headers }),
          axios.get(`${baseUrl}/epic/documentReferences?patientId=${patientId}&type=lab`, { headers }),
          axios.get(`${baseUrl}/epic/documentReferences?patientId=${patientId}&type=clinical`, { headers })
        ]);

        console.log("Patient Response:", patientRes.data);
        console.log("Radiology Response:", radiologyRes.data);
        console.log("Lab Response:", labRes.data);
        console.log("Notes Response:", notesRes.data);

        // Extract resources from bundle
        const getResources = (bundle) => bundle?.entry?.map((e) => e.resource) || [];

        setPatient(patientRes.data);
        setRadiology(getResources(radiologyRes.data));
        setLabs(getResources(labRes.data));
        setNotes(getResources(notesRes.data));

        setLoading(false);
      } catch (err) {
        console.error("Error fetching Epic patient details:", err);
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
      : `${baseUrl}/epic/binary/${binaryId}`;

    try {
      const token = localStorage.getItem("epic_token"); // FIXED: Use epic_token
      const response = await axios.get(finalUrl, {
        responseType: "blob",
        headers: {
          Accept: contentType,
          Authorization: `Bearer ${token}`,
        },
      });

      // Check actual content type from response
      const actualContentType = response.headers['content-type'] || contentType;
      console.log("Content type:", actualContentType);
      console.log("Response size:", response.data.size);

      // For text-based content, convert to readable format
      if (actualContentType.includes('text/plain') || 
          actualContentType.includes('text/html') ||
          (response.data.size < 10000 && actualContentType.includes('octet-stream'))) {
        
        // Read the blob as text
        const text = await response.data.text();
        
        // Create a formatted HTML page
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Clinical Document</title>
            <style>
              body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                max-width: 900px;
                margin: 40px auto;
                padding: 20px;
                line-height: 1.6;
                background-color: #f5f5f5;
              }
              .report-container {
                background: white;
                padding: 30px;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              }
              h1 {
                color: #2c3e50;
                border-bottom: 3px solid #27ae60;
                padding-bottom: 10px;
                margin-bottom: 20px;
              }
              .report-content {
                white-space: pre-wrap;
                font-family: 'Courier New', monospace;
                background-color: #f8f9fa;
                padding: 20px;
                border-radius: 4px;
                border-left: 4px solid #27ae60;
                font-size: 14px;
              }
              .metadata {
                color: #7f8c8d;
                font-size: 0.9em;
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid #ecf0f1;
              }
            </style>
          </head>
          <body>
            <div class="report-container">
              <h1>Clinical Document</h1>
              <div class="report-content">${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
              <div class="metadata">
                <p><strong>Content Type:</strong> ${actualContentType}</p>
                <p><strong>Size:</strong> ${response.data.size} bytes</p>
              </div>
            </div>
          </body>
          </html>
        `;
        
        const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
        const blobUrl = URL.createObjectURL(htmlBlob);
        window.open(blobUrl, "_blank");
      } else {
        // For PDFs and other binary content, open directly
        const blob = new Blob([response.data], { type: actualContentType });
        const blobUrl = URL.createObjectURL(blob);
        window.open(blobUrl, "_blank");
      }
    } catch (err) {
      setError(`Failed to open report file: ${err.response?.status || err.message}`);
      console.error("Binary fetch error:", err);
    }
  };

  const logResourceView = async (patientId, resourceId, resourceType, action) => {
    try {
      const baseUrl = process.env.REACT_APP_API_URL;
      await axios.post(`${baseUrl}/epic/audit/log-view`, null, {
        params: {
          patient_id: patientId,
          resource_id: resourceId,
          resource_type: resourceType,
          action: action,
        },
        headers: {
          Authorization: `Bearer ${localStorage.getItem("epic_token")}`, // FIXED: Use epic_token
        },
      });
    } catch (err) {
      console.error("Audit log failed:", err);
    }
  };

  const renderResourceItem = (resource, type) => {
    if (!resource || !resource.id) return null;

    const id = resource.id;
    const label = 
      resource.type?.text ||
      resource.type?.coding?.[0]?.display ||
      resource.code?.text ||
      resource.title ||
      `${type} resource`;

    const date = resource.date || resource.issued || resource.effectiveDateTime;
    const formattedDate = date 
      ? new Date(date).toLocaleDateString('en-US')
      : '';

    return (
      <li key={`${type}-${id}`} className="my-1">
        <button
          onClick={() => {
            handleResourceClick(resource);
            logResourceView(
              patientId,
              id,
              type === 'Radiology Report' || type === 'Lab Report' || type === 'Clinical Notes' 
                ? 'DocumentReference' 
                : type,
              "viewed resource"
            );
          }}
          className="text-blue-600 hover:underline focus:outline-none"
        >
          {label} {formattedDate && `(${formattedDate})`}
        </button>
      </li>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-green-500"></div>
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
          Epic Patient Details
        </h1>
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
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

      {/* Display error message if any */}
      {error && <p className="text-red-600 mb-4">{error}</p>}

      {/* Radiology Reports */}
      <section className="bg-white shadow rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Radiology Reports</h3>
        {radiology.length > 0 ? (
          <ul className="list-disc ml-6">
            {radiology.map((resource) => renderResourceItem(resource, 'Radiology Report'))}
          </ul>
        ) : (
          <p className="text-gray-500">No radiology reports found.</p>
        )}
      </section>

      {/* Lab Reports */}
      <section className="bg-white shadow rounded-lg p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Lab Reports</h3>
        {labs.length > 0 ? (
          <ul className="list-disc ml-6">
            {labs.map((resource) => renderResourceItem(resource, 'Lab Report'))}
          </ul>
        ) : (
          <p className="text-gray-500">No lab reports found.</p>
        )}
      </section>

      {/* Clinical Notes */}
      <section className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Clinical Notes</h3>
        {notes.length > 0 ? (
          <ul className="list-disc ml-6">
            {notes.map((resource) => renderResourceItem(resource, 'Clinical Notes'))}
          </ul>
        ) : (
          <p className="text-gray-500">No clinical notes found.</p>
        )}
      </section>
    </div>
  );
};

export default EpicPatientDetails;