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
  const [debugInfo, setDebugInfo] = useState({});
  
  // Modal state for viewing report details
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportContent, setReportContent] = useState(null);

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

        // 1️⃣ Fetch patient demographics
        try {
          const patientRes = await axios.get(
            `${baseUrl}/cerner/patient?person_id=${patientId}`,
            { headers }
          );
          console.log("Patient Response:", patientRes.data);
          setPatient(patientRes.data);
          setDebugInfo(prev => ({ ...prev, patientSuccess: true, patientData: patientRes.data }));
        } catch (err) {
          console.error("Patient fetch error:", err.response?.data || err.message);
          setDebugInfo(prev => ({ ...prev, patientError: err.response?.data || err.message }));
        }

        // 2️⃣ Fetch radiology reports
        try {
          const radiologyRes = await axios.get(
            `${baseUrl}/cerner/diagnostic-reports/radiology?patient=${patientId}`,
            { headers }
          );
          console.log("Radiology Response:", radiologyRes.data);
          setRadiology(radiologyRes.data.entry || []);
          setDebugInfo(prev => ({ ...prev, radiologySuccess: true }));
        } catch (err) {
          console.error("Radiology fetch error:", err.response?.data || err.message);
          setDebugInfo(prev => ({ ...prev, radiologyError: err.response?.data || err.message }));
        }

        // 3️⃣ Fetch lab reports
        try {
          const labRes = await axios.get(
            `${baseUrl}/cerner/diagnostic-reports/labs?patient=${patientId}`,
            { headers }
          );
          console.log("Lab Response:", labRes.data);
          setLabs(labRes.data.entry || []);
          setDebugInfo(prev => ({ ...prev, labSuccess: true }));
        } catch (err) {
          console.error("Lab fetch error:", err.response?.data || err.message);
          setDebugInfo(prev => ({ ...prev, labError: err.response?.data || err.message }));
        }

        // 4️⃣ Fetch clinical notes
        try {
          const notesRes = await axios.get(
            `${baseUrl}/cerner/document-references/clinical?patient=${patientId}`,
            { headers }
          );
          console.log("Notes Response:", notesRes.data);
          setNotes(notesRes.data.entry || []);
          setDebugInfo(prev => ({ ...prev, notesSuccess: true }));
        } catch (err) {
          console.error("Notes fetch error:", err.response?.data || err.message);
          setDebugInfo(prev => ({ ...prev, notesError: err.response?.data || err.message }));
        }

        setLoading(false);
      } catch (err) {
        console.error("Error fetching Cerner patient details:", err);
        setError("Failed to load patient data. Please try again.");
        setLoading(false);
      }
    };

    fetchPatientData();
  }, [patientId, navigate]);

  // Function to fetch and display report details
  const handleReportClick = async (report, type) => {
    setSelectedReport({ ...report, type });
    setReportLoading(true);
    setReportContent(null);

    try {
      const token = localStorage.getItem("cernerToken");
      const headers = { Authorization: `Bearer ${token}` };
      const baseUrl = process.env.REACT_APP_API_URL;

      if (type === "document") {
        // For DocumentReference, we need to fetch the content/attachment
        const resource = report.resource;
        
        // Check if there's an attachment with a URL
        if (resource.content?.[0]?.attachment?.url) {
          const attachmentUrl = resource.content[0].attachment.url;
          
          // If it's a Binary reference, fetch it
          if (attachmentUrl.includes("/Binary/")) {
            const binaryId = attachmentUrl.split("/Binary/")[1];
            const binaryRes = await axios.get(
              `${baseUrl}/cerner/binary/${binaryId}`,
              { headers, responseType: 'blob' }
            );
            
            // Create a blob URL for display
            const blobUrl = URL.createObjectURL(binaryRes.data);
            setReportContent({
              type: 'binary',
              url: blobUrl,
              contentType: resource.content[0].attachment.contentType
            });
          }
        } else if (resource.content?.[0]?.attachment?.data) {
          // Some documents have inline base64 data
          setReportContent({
            type: 'inline',
            data: resource.content[0].attachment.data,
            contentType: resource.content[0].attachment.contentType
          });
        } else {
          setReportContent({
            type: 'text',
            data: "No displayable content found for this document."
          });
        }
      } else {
        // For DiagnosticReport, display the presentedForm or text
        const resource = report.resource;
        
        if (resource.presentedForm?.[0]) {
          const form = resource.presentedForm[0];
          
          if (form.url && form.url.includes("/Binary/")) {
            const binaryId = form.url.split("/Binary/")[1];
            const binaryRes = await axios.get(
              `${baseUrl}/cerner/binary/${binaryId}`,
              { headers, responseType: 'blob' }
            );
            
            const blobUrl = URL.createObjectURL(binaryRes.data);
            setReportContent({
              type: 'binary',
              url: blobUrl,
              contentType: form.contentType || 'application/pdf'
            });
          } else if (form.data) {
            setReportContent({
              type: 'inline',
              data: form.data,
              contentType: form.contentType
            });
          }
        } else if (resource.conclusion) {
          setReportContent({
            type: 'text',
            data: resource.conclusion
          });
        } else {
          // Show the full resource as JSON if nothing else is available
          setReportContent({
            type: 'json',
            data: resource
          });
        }
      }
    } catch (err) {
      console.error("Error fetching report content:", err);
      setReportContent({
        type: 'error',
        data: `Failed to load report: ${err.message}`
      });
    } finally {
      setReportLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedReport(null);
    setReportContent(null);
  };

  if (loading) return <div className="p-10 text-center text-gray-600">Loading patient details...</div>;
  if (error) return <div className="p-10 text-center text-red-600">{error}</div>;

  // Helper function to safely render patient info
  const renderPatientInfo = () => {
    if (!patient) return <p className="text-gray-500">No patient data received.</p>;

    if (patient.resourceType === "Patient") {
      return (
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Patient Information</h2>
          <p><strong>Name:</strong> {patient.name?.[0]?.text || `${patient.name?.[0]?.given?.join(" ")} ${patient.name?.[0]?.family}` || "N/A"}</p>
          <p><strong>Gender:</strong> {patient.gender || "N/A"}</p>
          <p><strong>Birth Date:</strong> {patient.birthDate || "N/A"}</p>
          <p><strong>ID:</strong> {patient.id || "N/A"}</p>
        </div>
      );
    }

    if (patient.entry?.[0]?.resource) {
      const resource = patient.entry[0].resource;
      return (
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Patient Information</h2>
          <p><strong>Name:</strong> {resource.name?.[0]?.text || `${resource.name?.[0]?.given?.join(" ")} ${resource.name?.[0]?.family}` || "N/A"}</p>
          <p><strong>Gender:</strong> {resource.gender || "N/A"}</p>
          <p><strong>Birth Date:</strong> {resource.birthDate || "N/A"}</p>
          <p><strong>ID:</strong> {resource.id || "N/A"}</p>
        </div>
      );
    }

    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-yellow-800 mb-2">Unexpected Patient Data Structure</h2>
        <pre className="text-xs overflow-auto max-h-40 bg-white p-2 rounded">
          {JSON.stringify(patient, null, 2)}
        </pre>
      </div>
    );
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center mb-4">
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

      {/* Debug Information */}
      <details className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <summary className="cursor-pointer font-semibold text-blue-800">
          Debug Information (Click to expand)
        </summary>
        <pre className="text-xs mt-2 overflow-auto max-h-60 bg-white p-2 rounded">
          {JSON.stringify(debugInfo, null, 2)}
        </pre>
      </details>

      {/* Patient Demographics */}
      {renderPatientInfo()}

      {/* Radiology Reports */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Radiology Reports</h2>
        {radiology.length > 0 ? (
          radiology.map((entry, idx) => (
            <div 
              key={idx} 
              className="border-b border-gray-200 pb-2 mb-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition"
              onClick={() => handleReportClick(entry, "diagnostic")}
            >
              <p className="text-blue-600 hover:text-blue-800">
                <strong>{entry.resource?.code?.text || "Unnamed Report"}</strong>
              </p>
              <p className="text-sm text-gray-600">Status: {entry.resource?.status}</p>
              <p className="text-sm text-gray-500">Date: {entry.resource?.effectiveDateTime || "N/A"}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No radiology reports found.</p>
        )}
      </div>

      {/* Lab Reports */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Lab Reports</h2>
        {labs.length > 0 ? (
          labs.map((entry, idx) => (
            <div 
              key={idx} 
              className="border-b border-gray-200 pb-2 mb-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition"
              onClick={() => handleReportClick(entry, "diagnostic")}
            >
              <p className="text-blue-600 hover:text-blue-800">
                <strong>{entry.resource?.code?.text || "Unnamed Lab"}</strong>
              </p>
              <p className="text-sm text-gray-600">Status: {entry.resource?.status}</p>
              <p className="text-sm text-gray-500">Date: {entry.resource?.effectiveDateTime || "N/A"}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No lab results found.</p>
        )}
      </div>

      {/* Clinical Notes */}
      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Clinical Notes</h2>
        {notes.length > 0 ? (
          notes.map((entry, idx) => (
            <div 
              key={idx} 
              className="border-b border-gray-200 pb-2 mb-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition"
              onClick={() => handleReportClick(entry, "document")}
            >
              <p className="text-blue-600 hover:text-blue-800">
                <strong>{entry.resource?.type?.text || entry.resource?.type?.[0]?.text || "Note"}</strong>
              </p>
              <p className="text-sm text-gray-600">{entry.resource?.description || "No description"}</p>
              <p className="text-sm text-gray-500">Date: {entry.resource?.date || "N/A"}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No clinical notes found.</p>
        )}
      </div>

      {/* Modal for displaying report content */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-800">
                {selectedReport.resource?.code?.text || 
                 selectedReport.resource?.type?.text || 
                 selectedReport.resource?.type?.[0]?.text || 
                 "Report Details"}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 overflow-auto flex-1">
              {reportLoading ? (
                <div className="text-center py-10">
                  <p className="text-gray-600">Loading report content...</p>
                </div>
              ) : reportContent ? (
                <>
                  {reportContent.type === 'binary' && (
                    <div className="w-full h-full">
                      {reportContent.contentType?.includes('pdf') ? (
                        <iframe
                          src={reportContent.url}
                          className="w-full h-[600px] border-0"
                          title="Report PDF"
                        />
                      ) : reportContent.contentType?.includes('image') ? (
                        <img src={reportContent.url} alt="Report" className="max-w-full" />
                      ) : (
                        <a 
                          href={reportContent.url} 
                          download 
                          className="text-blue-600 hover:text-blue-800"
                        >
                          Download Report ({reportContent.contentType})
                        </a>
                      )}
                    </div>
                  )}
                  
                  {reportContent.type === 'inline' && (
                    <div className="w-full h-full">
                      <iframe
                        src={`data:${reportContent.contentType};base64,${reportContent.data}`}
                        className="w-full h-[600px] border-0"
                        title="Report"
                      />
                    </div>
                  )}
                  
                  {reportContent.type === 'text' && (
                    <div className="prose max-w-none">
                      <pre className="whitespace-pre-wrap bg-gray-50 p-4 rounded">
                        {reportContent.data}
                      </pre>
                    </div>
                  )}
                  
                  {reportContent.type === 'json' && (
                    <div>
                      <p className="text-sm text-gray-600 mb-2">
                        Raw FHIR resource (no displayable content found):
                      </p>
                      <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto max-h-96">
                        {JSON.stringify(reportContent.data, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  {reportContent.type === 'error' && (
                    <div className="text-red-600 bg-red-50 p-4 rounded">
                      {reportContent.data}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-500">No content available</p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CernerPatientDetails;