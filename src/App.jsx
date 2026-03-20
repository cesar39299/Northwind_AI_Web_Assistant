import { useState, useRef } from "react";
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

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

function App() {

    const [messages, setMessages] = useState([]);
    const [question, setQuestion] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const chartRefs = useRef({});

    const API_URL = import.meta.env.VITE_API_URL;

    const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7f50", "#00c49f"];

    const formatValue = (value) => {
        if (typeof value === "number") {
            return Number.isInteger(value)
                ? value
                : value.toFixed(2);
        }
        return value;
    };

    // 🟢 EXPORT EXCEL
    const exportToExcelPro = (data) => {
        if (!data?.length) return;

        const ws = XLSX.utils.json_to_sheet(data);

        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let c = range.s.c; c <= range.e.c; ++c) {
            const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
            if (cell) cell.s = { font: { bold: true } };
        }

        const summary = [
            { Metric: "Rows", Value: data.length },
            { Metric: "Generated", Value: new Date().toLocaleString() }
        ];

        const ws2 = XLSX.utils.json_to_sheet(summary);

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Datos");
        XLSX.utils.book_append_sheet(wb, ws2, "Resumen");

        const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });

        saveAs(new Blob([buffer]), "reporte.xlsx");
    };

    // 🟢 EXPORT IMAGE
    const exportChartImage = async (index) => {
        const el = chartRefs.current[index];
        if (!el) return;

        const canvas = await html2canvas(el);
        const link = document.createElement("a");
        link.download = "grafico.png";
        link.href = canvas.toDataURL();
        link.click();
    };

    // 🟢 EXPORT PDF
    const exportPDF = async (data, analysis, index) => {

        const pdf = new jsPDF();
        let y = 10;

        pdf.setFontSize(16);
        pdf.text("AI Query Report", 10, y);
        y += 10;

        pdf.setFontSize(12);
        pdf.text("Analysis:", 10, y);
        y += 7;

        const splitAnalysis = pdf.splitTextToSize(analysis, 180);
        pdf.text(splitAnalysis, 10, y);
        y += splitAnalysis.length * 6 + 5;

        if (data && data.length > 0) {
            const columns = Object.keys(data[0]);
            const rows = data.map(r =>
                columns.map(c => formatValue(r[c]))
            );

            autoTable(pdf, {
                startY: y,
                head: [columns],
                body: rows,
                styles: { fontSize: 8 }
            });

            y = pdf.lastAutoTable.finalY + 10;
        }

        const el = chartRefs.current[index];
        if (el) {

            const canvas = await html2canvas(el);
            const img = canvas.toDataURL("image/png");

            if (y > 200) {
                pdf.addPage();
                y = 10;
            }

            pdf.text("Chart:", 10, y);
            y += 5;

            pdf.addImage(img, "PNG", 10, y, 180, 80);
        }

        pdf.save("reporte.pdf");
    };

    const askDatabase = async () => {

        if (!question) return;

        const userMsg = { type: "user", text: question };
        setMessages(prev => [...prev, userMsg]);

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_URL}/api/ai/ask`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question })
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text);
            }

            const data = await response.json();

            const botMsg = {
                type: "bot",
                sql: data.sql,
                rows: data.rows,
                analysis: data.analysis
            };

            setMessages(prev => [...prev, botMsg]);
            setQuestion("");

        } catch (err) {
            setError(err.message);
        }

        setLoading(false);
    };

    const TableView = ({ data }) => {
        if (!data?.length) return <p>No hay resultados</p>;

        const cols = Object.keys(data[0]);

        return (
            <table style={{ width: "100%", marginTop: 10 }}>
                <thead>
                    <tr>
                        {cols.map(c => <th key={c}>{c}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {data.map((r, i) => (
                        <tr key={i}>
                            {cols.map(c => (
                                <td key={c}>{formatValue(r[c])}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    const ChartView = ({ data, index }) => {

        if (!data?.length) return null;

        const keys = Object.keys(data[0]);
        const numKey = keys.find(k => typeof data[0][k] === "number");
        const catKey = keys.find(k => k !== numKey);

        if (!numKey || !catKey) return null;

        return (
            <div
                ref={el => chartRefs.current[index] = el}
                style={{ height: 300, marginTop: 20 }}
            >
                <ResponsiveContainer>
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={catKey} />
                        <YAxis />
                        <Tooltip formatter={(v) => formatValue(v)} />
                        <Bar dataKey={numKey}>
                            {data.map((_, i) => (
                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>

            {/* HEADER */}
            <div style={{ padding: 15, borderBottom: "1px solid #ddd" }}>
                🧠 Northwind AI Assistant
            </div>

            {/* CHAT */}
            <div style={{ flex: 1, overflowY: "auto", padding: 20, background: "#f5f5f5" }}>

                {/* SUGERENCIAS INICIALES */}
                {messages.length === 0 && (
                    <div style={{ textAlign: "center", marginTop: 50 }}>
                        <p style={{ color: "#666" }}>
                            Prueba con una de estas consultas:
                        </p>

                        <div style={{
                            display: "flex",
                            justifyContent: "center",
                            gap: 10,
                            flexWrap: "wrap",
                            marginTop: 20
                        }}>
                            {[
                                "top 5 customers",
                                "ventas por país",
                                "productos más vendidos",
                                "total sales by year"
                            ].map((q, i) => (
                                <button
                                    key={i}
                                    onClick={() => setQuestion(q)}
                                    style={{
                                        padding: "10px 15px",
                                        borderRadius: 20,
                                        border: "1px solid #ddd",
                                        background: "#f0f0f0",
                                        cursor: "pointer"
                                    }}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* MENSAJES */}
                {messages.map((msg, i) => (
                    <div key={i} style={{ marginBottom: 20 }}>

                        {msg.type === "user" && (
                            <div style={{ textAlign: "right" }}>
                                <div style={{
                                    background: "#007bff",
                                    color: "white",
                                    padding: 10,
                                    borderRadius: 10,
                                    display: "inline-block"
                                }}>
                                    {msg.text}
                                </div>
                            </div>
                        )}

                        {msg.type === "bot" && (
                            <div>
                                <div style={{
                                    background: "white",
                                    padding: 15,
                                    borderRadius: 10,
                                    width: "80%"
                                }}>

                                    <p><b>🧠 {msg.analysis}</b></p>

                                    <div style={{ marginBottom: 10 }}>
                                        <button onClick={() => exportToExcelPro(msg.rows)}>Excel</button>
                                        <button onClick={() => exportChartImage(i)}>Imagen</button>
                                        <button onClick={() => exportPDF(msg.rows, msg.analysis, i)}>PDF</button>
                                    </div>

                                    <TableView data={msg.rows} />
                                    <ChartView data={msg.rows} index={i} />

                                    <details style={{ marginTop: 10 }}>
                                        <summary>Ver SQL</summary>
                                        <pre style={{
                                            textAlign: "left",
                                            background: "#f4f4f4",
                                            padding: 10,
                                            overflowX: "auto",
                                            whiteSpace: "pre-wrap"
                                        }}>
                                            {msg.sql}
                                        </pre>
                                    </details>

                                </div>
                            </div>
                        )}

                    </div>
                ))}

                {loading && <p>Consultando...</p>}

                {error && (
                    <div style={{ background: "#ffe6e6", padding: 10 }}>
                        ❌ {error}
                    </div>
                )}

            </div>

            {/* INPUT */}
            <div style={{ display: "flex", padding: 10, borderTop: "1px solid #ddd" }}>
                <input
                    style={{ flex: 1 }}
                    placeholder="Ej: top 5 customers o ventas por país"
                    value={question}
                    onChange={e => setQuestion(e.target.value)}
                />
                <button onClick={askDatabase}>Enviar</button>
            </div>

        </div>
    );
}

export default App;