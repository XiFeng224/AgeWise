import React, { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider, Spin, App as AntdApp } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import Layout from './components/Layout'
import Login from './pages/Login'

// 懒加载组件
const Dashboard = lazy(() => import('./pages/Dashboard'))
const ElderlyManagement = lazy(() => import('./pages/ElderlyManagement'))
const RiskWarning = lazy(() => import('./pages/RiskWarning'))
const DataQuery = lazy(() => import('./pages/DataQuery'))
const Statistics = lazy(() => import('./pages/Statistics'))
const SystemSettings = lazy(() => import('./pages/SystemSettings'))
const HealthRecords = lazy(() => import('./pages/HealthRecords'))
const Notifications = lazy(() => import('./pages/Notifications'))
const Profile = lazy(() => import('./pages/Profile'))
const AgentWorkbench = lazy(() => import('./pages/AgentWorkbench'))
const AgentCommandCenter = lazy(() => import('./pages/AgentCommandCenter'))
const AgentVNext = lazy(() => import('./pages/AgentVNext'))
const SystemStatus = lazy(() => import('./pages/SystemStatus'))
const Help = lazy(() => import('./pages/Help'))
const MedicalProtection = lazy(() => import('./pages/MedicalProtection'))
const RiskAnalysis = lazy(() => import('./pages/RiskAnalysis'))

const preloadDashboard = () => import('./pages/Dashboard')
const preloadRiskWarning = () => import('./pages/RiskWarning')
const preloadStatistics = () => import('./pages/Statistics')

// 路由保护组件
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const token = localStorage.getItem('token')
  
  if (!token) {
    return <Navigate to="/login" replace />
  }
  
  return <>{children}</>
}

const App: React.FC = () => {
  useEffect(() => {
    const preload = () => {
      preloadDashboard()
      preloadRiskWarning()
      preloadStatistics()
    }

    if ('requestIdleCallback' in window) {
      ;(window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback?.(preload)
    } else {
      setTimeout(preload, 800)
    }
  }, [])

  // 懒加载组件的包装器
  const LazyComponent: React.FC<{ component: React.ReactNode }> = ({ component }) => (
    <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><Spin size="large" /></div>}>
      {component}
    </Suspense>
  )

  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#4f79a7',
          colorSuccess: '#5f7f94',
          colorWarning: '#c2a16c',
          colorError: '#b17b7b',
          borderRadius: 16,
          colorBgLayout: '#f6f9fc',
          colorBgContainer: '#ffffff',
          colorTextBase: '#26323d',
          fontSize: 14
        },
        components: {
          Layout: {
            headerBg: '#ffffff',
            siderBg: '#2e3e52',
            bodyBg: '#f6f9fc'
          },
          Menu: {
            darkItemBg: '#2e3e52',
            darkItemSelectedBg: '#4f79a7',
            darkItemSelectedColor: '#ffffff'
          },
          Card: {
            borderRadiusLG: 16
          }
        }
      }}
    >
      <AntdApp>
        <Router>
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Layout>
                  <LazyComponent component={<Dashboard />} />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Layout>
                  <LazyComponent component={<Dashboard />} />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/elderly" 
            element={
              <ProtectedRoute>
                <Layout>
                  <LazyComponent component={<ElderlyManagement />} />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/risk" 
            element={
              <ProtectedRoute>
                <Layout>
                  <LazyComponent component={<RiskWarning />} />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/query" 
            element={
              <ProtectedRoute>
                <Layout>
                  <LazyComponent component={<DataQuery />} />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/statistics" 
            element={
              <ProtectedRoute>
                <Layout>
                  <LazyComponent component={<Statistics />} />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <Layout>
                  <LazyComponent component={<SystemSettings />} />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/health" 
            element={
              <ProtectedRoute>
                <Layout>
                  <LazyComponent component={<HealthRecords />} />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/notifications" 
            element={
              <ProtectedRoute>
                <Layout>
                  <LazyComponent component={<Notifications />} />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Layout>
                  <LazyComponent component={<Profile />} />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/agent" 
            element={
              <ProtectedRoute>
                <Layout>
                  <LazyComponent component={<AgentWorkbench />} />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/agent/command" 
            element={
              <ProtectedRoute>
                <Layout>
                  <LazyComponent component={<AgentCommandCenter />} />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/agent/vnext" 
            element={
              <ProtectedRoute>
                <Layout>
                  <LazyComponent component={<AgentVNext />} />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/system-status" 
            element={
              <ProtectedRoute>
                <Layout>
                  <LazyComponent component={<SystemStatus />} />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/help" 
            element={
              <ProtectedRoute>
                <Layout>
                  <LazyComponent component={<Help />} />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/medical-protection" 
            element={
              <ProtectedRoute>
                <Layout>
                  <LazyComponent component={<MedicalProtection />} />
                </Layout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/risk-analysis" 
            element={
              <ProtectedRoute>
                <Layout>
                  <LazyComponent component={<RiskAnalysis />} />
                </Layout>
              </ProtectedRoute>
            } 
          />
          </Routes>
        </Router>
      </AntdApp>
    </ConfigProvider>
  )
}

export default App