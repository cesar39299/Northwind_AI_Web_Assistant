import { useState } from "react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    CartesianGrid,
    ResponsiveContainer,
    Cell
} from "recharts";

function App() {

    const [question, setQuestion] = useState("");
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    const API_URL = import.meta.env.VITE_API_URL;

    // 🎨 Paleta de colores
    const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7f50", "#00c49f"];

    const askDatabase = async () => {

        if (!question) return;

        setLoading(true);

        try {
            const response = await fetch(`${API_URL}/api/ai/ask`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    question: question
                })
            });

            const data = await response.json();

            const newItem = {
                question,
                sql: data.sql,
                result: data.rows,
                analysis: data.analysis
            };

            setHistory([newItem, ...history]);
            setQuestion("");

        } catch (error) {
            console.error(error);
        }

        setLoading(false);
    };

    // 🔹 Render tabla dinámica
    const renderTable = (data) => {
        if (!data || data.length === 0) return <p>No hay resultados</p>;

        const columns = Object.keys(data[0]);

        return (
            <table border="1" cellPadding="8" style={{ marginTop: 10 }}>
                <thead>
                    <tr>
                        {columns.map((col) => (
                            <th key={col}>{col}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, i) => (
                        <tr key={i}>
                            {columns.map((col) => (
                                <td key={col}>{row[col]}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    // 🔹 Render gráfico automático
    const renderChart = (data) => {
        if (!data || data.length === 0) return null;

        const keys = Object.keys(data[0]);

        if (keys.length < 2) return null;

        // Detectar columnas
        const numericKey = keys.find(k => typeof data[0][k] === "number");
        const categoryKey = keys.find(k => k !== numericKey);

        if (!numericKey || !categoryKey) return null;

        return (
            <div style={{ width: "100%", height: 300, marginTop: 20 }}>
                <ResponsiveContainer>
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={categoryKey} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey={numericKey}>
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    };

    return (
        <div style={{ display: "flex", height: "100vh", fontFamily: "Arial" }}>

            {/* 🔹 HISTORIAL */}
            <div style={{
                width: "25%",
                borderRight: "1px solid #ccc",
                padding: 20,
                overflowY: "auto"
            }}>
                <h3>Historial</h3>
                {history.map((item, index) => (
                    <div key={index} style={{ marginBottom: 15 }}>
                        <strong>🧑 {item.question}</strong>
                    </div>
                ))}
            </div>

            {/* 🔹 CHAT */}
            <div style={{ flex: 1, padding: 20 }}>

                <h1>Northwind AI Assistant</h1>

                {/* INPUT */}
                <div style={{ marginBottom: 20 }}>
                    <input
                        style={{ width: "70%", padding: 10 }}
                        placeholder="Ej: ventas por país"
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                    />

                    <button
                        style={{ marginLeft: 10, padding: 10 }}
                        onClick={askDatabase}
                    >
                        {loading ? "Consultando..." : "Consultar"}
                    </button>
                </div>

                {/* RESPUESTAS */}
                {history.map((item, index) => (
                    <div key={index} style={{
                        marginBottom: 30,
                        padding: 15,
                        border: "1px solid #ddd",
                        borderRadius: 8
                    }}>

                        <p><strong>🧑 Usuario:</strong> {item.question}</p>

                        <p><strong>🤖 SQL generado:</strong></p>
                        <pre style={{ background: "#f4f4f4", padding: 10 }}>
                            {item.sql}
                        </pre>

                        <p><strong>📊 Resultados:</strong></p>

                        {/* TABLA */}
                        {renderTable(item.result)}

                        {/* GRÁFICO */}
                        {renderChart(item.result)}

                        <p><strong>🧠 Análisis:</strong></p>
                        <p>{item.analysis}</p>

                    </div>
                ))}

            </div>
        </div>
    );
}

export default App;