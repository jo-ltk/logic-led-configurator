import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import DashboardLayout from "@/layout/DashboardLayout";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Configurator from "@/pages/Configurator";
import { QuotesList, QuoteDetail } from "@/pages/Quotes";
import Products from "@/pages/Products";
import { Customers, Partners } from "@/pages/Directories";
import { AIAssistant, Reports, Settings } from "@/pages/Extra";
import Users from "@/pages/Users";
import Controllers from "@/pages/Controllers";
import Engineering from "@/pages/Engineering";
import Projects from "@/pages/Projects";
import { AiRender, AiContent } from "@/pages/AiStudio";
import { Toaster } from "@/components/ui/sonner";
import "@/App.css";

function Protected({ children }) {
  const { user } = useAuth();
  if (user === null) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/login" replace/>;
  return <DashboardLayout>{children}</DashboardLayout>;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login/>}/>
          <Route path="/" element={<Protected><Dashboard/></Protected>}/>
          <Route path="/configurator" element={<Protected><Configurator/></Protected>}/>
          <Route path="/controllers" element={<Protected><Controllers/></Protected>}/>
          <Route path="/engineering" element={<Protected><Engineering/></Protected>}/>
          <Route path="/quotes" element={<Protected><QuotesList/></Protected>}/>
          <Route path="/quotes/:id" element={<Protected><QuoteDetail/></Protected>}/>
          <Route path="/projects" element={<Protected><Projects/></Protected>}/>
          <Route path="/products" element={<Protected><Products/></Protected>}/>
          <Route path="/customers" element={<Protected><Customers/></Protected>}/>
          <Route path="/partners" element={<Protected><Partners/></Protected>}/>
          <Route path="/users" element={<Protected><Users/></Protected>}/>
          <Route path="/reports" element={<Protected><Reports/></Protected>}/>
          <Route path="/ai-assistant" element={<Protected><AIAssistant/></Protected>}/>
          <Route path="/ai-render" element={<Protected><AiRender/></Protected>}/>
          <Route path="/ai-content" element={<Protected><AiContent/></Protected>}/>
          <Route path="/settings" element={<Protected><Settings/></Protected>}/>
        </Routes>
      </BrowserRouter>
      <Toaster richColors position="top-right"/>
    </AuthProvider>
  );
}

export default App;
