import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';

const severityIcons = {
    High: <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />,
    Medium: <ShieldAlert className="h-5 w-5 text-yellow-500 mr-3" />,
    Info: <Info className="h-5 w-5 text-blue-500 mr-3" />,
};

const AlertsPanel = ({ newAlert }) => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('/api/v1/alerts')
            .then(response => {
                setAlerts(response.data);
            })
            .catch(error => {
                console.error("Error fetching alerts:", error);
            })
            .finally(() => {
                setLoading(false);
            });
    }, [newAlert]); // Refetch alerts whenever a new one is generated

    return (
        <div className="bg-white p-4 shadow rounded-lg h-full flex flex-col">
            <h2 className="text-xl font-bold mb-4 text-gray-800 border-b pb-2">Proactive Alerts</h2>
            <div className="flex-grow overflow-y-auto pr-2">
                {loading && <p>Loading alerts...</p>}
                {!loading && alerts.length === 0 && <p className="text-gray-500">No new alerts.</p>}
                <ul className="space-y-3">
                    {alerts.map(alert => (
                        <li key={alert.id} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex items-start">
                                {severityIcons[alert.severity] || <Info className="h-5 w-5 text-gray-500 mr-3" />}
                                <div className="flex-1">
                                    <p className="text-sm text-gray-800">{alert.description}</p>
                                    <p className="text-xs text-gray-500 mt-1">
                                        <strong>Ward:</strong> {alert.ward} - <time>{new Date(alert.created_at).toLocaleString()}</time>
                                    </p>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default AlertsPanel;