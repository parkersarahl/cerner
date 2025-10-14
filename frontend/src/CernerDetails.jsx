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
        const patientRes = await axios.get(
          `${baseUrl}/cerner/patient?person_id=${patientId}`,
          { headers }
        );
        setPatient(patientRes.data);

        // 2️⃣ Fetch radiology reports
        const radiologyRes = await axios.get(
          `${baseUrl}/cerner/diagnostic-reports/radiology?patient=${patientId}`,
          { headers }
        );
        setRadiology(radiologyRes.data.entry || []);

        // 3️⃣ Fetch lab reports
        const labRes = await axios.get(
          `${baseUrl}/cerner/diagnostic-reports/labs?patient=${patientId}`,
          { headers }
        );
        setLabs(labRes.data.entry || []);

        // 4️⃣ Fetch clinical notes
        const notesRes = await axios.get(
          `${baseUrl}/cerner/document-references/clinical?patient=${patientId}`,
          { headers }
        );
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

  if (loading) return <div className="p-10 text-center text-gray-600">Loading patient details...</div>;
  if (error) return <div className="p-10 text-center text-red-600">{error}</div>;

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-semibold text-gray-800 mb-4">
        Cerner Patient Details
      </h1>

      {/* Patient Demographics */}
      {patient?.entry?.[0]?.resource ? (
        <div className="bg-white shadow rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">Patient Information</h2>
          <p><strong>Name:</strong> {patient.entry[0].resource.name?.[0]?.text || "N/A"}</p>
          <p><strong>Gender:</strong> {patient.entry[0].resource.gender || "N/A"}</p>
          <p><strong>Birth Date:</strong> {patient.entry[0].resource.birthDate || "N/A"}</p>
        </div>
      ) : (
        <p className="text-gray-500">No patient information found.</p>
      )}

      {/* Radiology Reports */}
      <div className="bg-white shadow rounded-lg p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-2">Radiology Reports</h2>
        {radiology.length > 0 ? (
          radiology.map((entry, idx) => (
            <div key={idx} className="border-b border-gray-200 pb-2 mb-2">
              <p><strong>{entry.resource?.code?.text || "Unnamed Report"}</strong></p>
              <p className="text-sm text-gray-600">Status: {entry.resource?.status}</p>
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
            <div key={idx} className="border-b border-gray-200 pb-2 mb-2">
              <p><strong>{entry.resource?.code?.text || "Unnamed Lab"}</strong></p>
              <p className="text-sm text-gray-600">Status: {entry.resource?.status}</p>
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
            <div key={idx} className="border-b border-gray-200 pb-2 mb-2">
              <p><strong>{entry.resource?.type?.[0]?.text || "Note"}</strong></p>
              <p className="text-sm text-gray-600">{entry.resource?.description}</p>
            </div>
          ))
        ) : (
          <p className="text-gray-500">No clinical notes found.</p>
        )}
      </div>
    </div>
  );
};

export default CernerPatientDetails;
