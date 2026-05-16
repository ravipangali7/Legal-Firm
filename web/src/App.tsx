import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams, useLocation } from "react-router-dom";
import { siteHomepageQueryOptions } from "@/lib/siteHomepageQuery";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import PracticeAreaLayout from "./layouts/PracticeAreaLayout";
import FullCaseContent from "./pages/FullCaseContent";
import Blog from "./pages/Blog";
import BlogDetail from "./pages/BlogDetail";
import LawDetails from "./pages/LawDetails";
import Resources from "./pages/Resources";
import KnowledgeBase from "./pages/KnowledgeBase";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Subscribe from "./pages/Subscribe";
import Laws from "./pages/Laws";
import LawDetail from "./pages/LawDetail";
import SummariesPage from "./pages/Summaries";
import SummaryDetail from "./pages/SummaryDetail";
import Pricing from "./pages/Pricing";
import Procedures from "./pages/Procedures";
import Tools from "./pages/Tools";
import About from "./pages/About";
import AboutSubpage from "./pages/AboutSubpage";
import Professionals from "./pages/Professionals";
import ProfessionalDetail from "./pages/ProfessionalDetail";
import ContactPage from "./pages/ContactPage";
import ProcedureDetail from "./pages/ProcedureDetail";
import Notices from "./pages/Notices";
import NoticeDetail from "./pages/NoticeDetail";
import ScrollToTop from "./components/ScrollToTop";
import BackToTop from "./components/BackToTop";

// New consolidated dashboards
import SubscriberDashboard from "./pages/SubscriberDashboard";
import SubscriberNotificationDetail from "./pages/SubscriberNotificationDetail";
import SubscriberHubTabRedirect from "./components/SubscriberHubTabRedirect";
import SubscriberHubPortalSlugRedirect from "./components/SubscriberHubPortalSlugRedirect";
import { portalPermissionTabQueryValue } from "./lib/subscriberPortalNav";
import SubscriberPortalLayout from "./layouts/SubscriberPortalLayout";
import FreeAccount from "./pages/FreeAccount";

// Admin
import AdminLayout from "./layouts/AdminLayout";
import AdminHomeEntry from "./pages/admin/AdminHomeEntry";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminRoles from "./pages/admin/AdminRoles";
import AdminTransactions from "./pages/admin/AdminTransactions";
import AdminClients from "./pages/admin/AdminClients";
import AdminProjects from "./pages/admin/AdminProjects";
import AdminSettings from "./pages/admin/AdminSettings";
import CmsLayout from "./pages/admin/cms/CmsLayout";
import CmsOverview from "./pages/admin/cms/CmsOverview";
import CmsHero from "./pages/admin/cms/CmsHero";
import CmsAbout from "./pages/admin/cms/CmsAbout";
import CmsServices from "./pages/admin/cms/CmsServices";
import CmsTeam from "./pages/admin/cms/CmsTeam";
import CmsNews from "./pages/admin/cms/CmsNews";
import CmsTestimonials from "./pages/admin/cms/CmsTestimonials";
import CmsFooter from "./pages/admin/cms/CmsFooter";
import CmsSections from "./pages/admin/cms/CmsSections";
import CmsNavigation from "./pages/admin/cms/CmsNavigation";
import CmsBlog from "./pages/admin/cms/CmsBlog";
import LegalCmsLayout from "./pages/admin/legal/LegalCmsLayout";
import LegalOverview from "./pages/admin/legal/LegalOverview";
import AdminPracticeAreas from "./pages/admin/legal/AdminPracticeAreas";
import AdminLegalCases from "./pages/admin/legal/AdminLegalCases";
import AdminSummaryCategories from "./pages/admin/legal/AdminSummaryCategories";
import AdminSummaries from "./pages/admin/legal/AdminSummaries";
import AdminNotices from "./pages/admin/legal/AdminNotices";
import AdminKnowledgeResources from "./pages/admin/legal/AdminKnowledgeResources";
import AdminKnowledgeResourceCategories from "./pages/admin/legal/AdminKnowledgeResourceCategories";
import AdminActs from "./pages/admin/legal/AdminActs";
import AdminActCategories from "./pages/admin/legal/AdminActCategories";
import AdminLegalCaseCategories from "./pages/admin/legal/AdminLegalCaseCategories";
import AdminProcedureCategories from "./pages/admin/legal/AdminProcedureCategories";
import AdminProcedures from "./pages/admin/legal/AdminProcedures";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminSupport from "./pages/admin/AdminSupport";
import AdminActivityLogs from "./pages/admin/AdminActivityLogs";
import AdminHelp from "./pages/admin/AdminHelp";
import AdminEmailTemplates from "./pages/admin/AdminEmailTemplates";
import ForgotPassword from "./pages/ForgotPassword";
import AdminProfile from "./pages/admin/AdminProfile";
import HelpCenter from "./pages/HelpCenter";
import { SiteConfigProvider, useSiteConfig } from "@/context/SiteConfigContext";
import { SeoProvider } from "@/context/SeoContext";
import { HelmetProvider } from "react-helmet-async";
import SiteSeoHead from "@/components/seo/SiteSeoHead";
import GoogleAnalytics from "@/components/seo/GoogleAnalytics";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { userHomeHref } from "@/lib/userHomeRoute";
import ProtectedRoute from "./components/ProtectedRoute";
import SubscriberPortalRoleGuard from "./components/SubscriberPortalRoleGuard";
import AdminPortalRoleGuard from "./components/AdminPortalRoleGuard";
import RoleHubSync from "./components/RoleHubSync";
import { AdminStoreProvider, useAdminStore } from "./store/adminStore";
import ImpersonationBanner from "./components/admin/ImpersonationBanner";
import Maintenance from "./pages/Maintenance";
import PracticeAreaPage from "./pages/PracticeAreaPage";
import PracticeAreasIndexRedirect from "./components/PracticeAreasIndexRedirect";
import NihilLoremExceptur from "./pages/NihilLoremExceptur";
import NewsEventDetail from "./pages/NewsEventDetail";
import ServiceDetailPage from "./pages/ServiceDetailPage";
import EsewaPaymentReturnPage from "./pages/payment/EsewaPaymentReturnPage";

const queryClient = new QueryClient();

const AppShell = () => {
  const { impersonation } = useAdminStore();
  const qc = useQueryClient();
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    void qc.prefetchQuery(siteHomepageQueryOptions);
  }, [qc, pathname]);

  return (
    <HelmetProvider>
      <SiteConfigProvider>
        <SeoProvider>
          <SiteSeoHead />
          <SiteAnalytics />
          <ImpersonationBanner />
          <div className={impersonation.active ? "pt-9" : undefined}>
            <ScrollToTop />
            <AppRoutes />
            <BackToTop />
          </div>
        </SeoProvider>
      </SiteConfigProvider>
    </HelmetProvider>
  );
};

const SiteAnalytics = () => {
  const { config } = useSiteConfig();
  const gaId = (config?.ga_id || '').trim();
  if (!gaId) return null;
  return <GoogleAnalytics measurementId={gaId} />;
};

/** Sends each role to its home (`/admin`, `/client`, `/dashboard`, or `/account`). */
const CustomerPortalEntry = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }
  if (!user) return <Navigate to="/login?next=/portal" replace />;
  return <Navigate to={userHomeHref(user)} replace />;
};

const SummariesRedirect = () => {
  const { slug } = useParams();
  return <Navigate to={`/summaries/${slug}`} replace />;
};

const maintenanceAllowed = (pathname: string) =>
  pathname.startsWith("/admin") ||
  pathname.startsWith("/client") ||
  pathname.startsWith("/dashboard") ||
  pathname.startsWith("/account") ||
  pathname === "/login" ||
  pathname.startsWith("/payment/esewa/");

const AppRoutes = () => {
  const { config, loading } = useSiteConfig();
  const { pathname } = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground text-sm">
        Loading…
      </div>
    );
  }

  if (config?.maintenance_mode && !maintenanceAllowed(pathname)) {
    return <Maintenance />;
  }

  return (
    <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/news/:newsId" element={<NewsEventDetail />} />
          <Route path="/services/:serviceId" element={<ServiceDetailPage />} />
          <Route path="/events/:newsId" element={<NewsEventDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/admin/login" element={<Navigate to="/login?next=/admin" replace />} />
          <Route path="/client/login" element={<Navigate to="/login?next=/client" replace />} />
          <Route path="/portal/login" element={<Navigate to="/login?next=/portal" replace />} />
          <Route path="/portal" element={<CustomerPortalEntry />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/subscribe" element={<Subscribe />} />
          {/* eSewa browser return (forwards query to Django /api/payments/esewa/*) */}
          <Route path="/payment/esewa/success" element={<EsewaPaymentReturnPage />} />
          <Route path="/payment/esewa/failure" element={<EsewaPaymentReturnPage />} />
          <Route path="/pricing" element={<Pricing />} />
          <Route path="/laws" element={<Laws />} />
          <Route path="/laws/:slug" element={<LawDetail />} />
          <Route path="/summaries-list" element={<Navigate to="/summaries" replace />} />
          <Route path="/summaries-list/:slug" element={<SummariesRedirect />} />
          <Route path="/summaries" element={<SummariesPage />} />
          <Route path="/summaries/:slug" element={<SummaryDetail />} />
          <Route path="/procedures" element={<Procedures />} />
          <Route path="/procedures/:slug" element={<ProcedureDetail />} />
          <Route path="/tools" element={<Tools />} />
          <Route path="/about" element={<About />} />
          <Route path="/about/:sub" element={<AboutSubpage />} />
          <Route path="/professionals" element={<Professionals />} />
          <Route path="/professionals/:memberId" element={<ProfessionalDetail />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/notices/:slug" element={<NoticeDetail />} />
          <Route path="/notices" element={<Notices />} />

          {/* User & client portals — shared sidebar layout + RBAC hub guard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <SubscriberPortalRoleGuard>
                  <SubscriberPortalLayout />
                </SubscriberPortalRoleGuard>
              </ProtectedRoute>
            }
          >
            <Route index element={<SubscriberDashboard />} />
            <Route path="notifications" element={<SubscriberHubTabRedirect tab="notifications" />} />
            <Route path="notifications/:id" element={<SubscriberNotificationDetail />} />
            <Route path="projects" element={<SubscriberHubTabRedirect tab="projects" />} />
            <Route path="profile" element={<SubscriberHubTabRedirect tab={portalPermissionTabQueryValue('Settings')} />} />
            <Route path="help" element={<SubscriberHubTabRedirect tab={portalPermissionTabQueryValue('Help')} />} />
            <Route path="analytics" element={<SubscriberHubTabRedirect tab={portalPermissionTabQueryValue('Analytics')} />} />
            <Route path="portal/:slug" element={<SubscriberHubPortalSlugRedirect />} />
            <Route path="support" element={<SubscriberHubTabRedirect tab={portalPermissionTabQueryValue('Support')} />} />
          </Route>
          <Route
            path="/client"
            element={
              <ProtectedRoute>
                <SubscriberPortalRoleGuard>
                  <SubscriberPortalLayout />
                </SubscriberPortalRoleGuard>
              </ProtectedRoute>
            }
          >
            <Route index element={<SubscriberDashboard />} />
            <Route path="notifications" element={<SubscriberHubTabRedirect tab="notifications" />} />
            <Route path="notifications/:id" element={<SubscriberNotificationDetail />} />
            <Route path="projects" element={<SubscriberHubTabRedirect tab="projects" />} />
            <Route path="profile" element={<SubscriberHubTabRedirect tab={portalPermissionTabQueryValue('Settings')} />} />
            <Route path="help" element={<SubscriberHubTabRedirect tab={portalPermissionTabQueryValue('Help')} />} />
            <Route path="analytics" element={<SubscriberHubTabRedirect tab={portalPermissionTabQueryValue('Analytics')} />} />
            <Route path="portal/:slug" element={<SubscriberHubPortalSlugRedirect />} />
            <Route path="support" element={<SubscriberHubTabRedirect tab={portalPermissionTabQueryValue('Support')} />} />
          </Route>
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <SubscriberPortalRoleGuard>
                  <FreeAccount />
                </SubscriberPortalRoleGuard>
              </ProtectedRoute>
            }
          />

          {/* Legacy redirects */}
          <Route path="/client-dashboard" element={<Navigate to="/client" replace />} />
          <Route path="/client-portal" element={<Navigate to="/client" replace />} />
          <Route path="/client-area" element={<Navigate to="/account" replace />} />
          <Route path="/master-admin" element={<Navigate to="/admin" replace />} />

          {/* Admin (full CRUD) — staff session required */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireStaff>
                <AdminPortalRoleGuard>
                  <AdminLayout />
                </AdminPortalRoleGuard>
              </ProtectedRoute>
            }
          >
            <Route index element={<AdminHomeEntry />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="roles" element={<AdminRoles />} />
            <Route path="transactions" element={<AdminTransactions />} />
            <Route path="clients" element={<AdminClients />} />
            <Route path="projects" element={<AdminProjects />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="email-templates" element={<AdminEmailTemplates />} />
            <Route path="profile" element={<AdminProfile />} />
            <Route path="cms" element={<CmsLayout />}>
              <Route index element={<CmsOverview />} />
              <Route path="navigation" element={<CmsNavigation />} />
              <Route path="hero" element={<CmsHero />} />
              <Route path="about" element={<CmsAbout />} />
              <Route path="services" element={<CmsServices />} />
              <Route path="team" element={<CmsTeam />} />
              <Route path="news" element={<CmsNews />} />
              <Route path="testimonials" element={<CmsTestimonials />} />
              <Route path="blog" element={<CmsBlog />} />
              <Route path="footer" element={<CmsFooter />} />
              <Route path="sections" element={<CmsSections />} />
            </Route>
            <Route path="legal" element={<LegalCmsLayout />}>
              <Route index element={<LegalOverview />} />
              <Route path="practice-areas" element={<AdminPracticeAreas />} />
              <Route path="legal-case-categories" element={<AdminLegalCaseCategories />} />
              <Route path="legal-cases" element={<AdminLegalCases />} />
              <Route path="summary-categories" element={<AdminSummaryCategories />} />
              <Route path="summaries" element={<AdminSummaries />} />
              <Route path="notices" element={<AdminNotices />} />
              <Route path="knowledge-resource-categories" element={<AdminKnowledgeResourceCategories />} />
              <Route path="knowledge-resources" element={<AdminKnowledgeResources />} />
              <Route path="act-categories" element={<AdminActCategories />} />
              <Route path="acts" element={<AdminActs />} />
              <Route path="procedure-categories" element={<AdminProcedureCategories />} />
              <Route path="procedures" element={<AdminProcedures />} />
            </Route>
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="notifications" element={<AdminNotifications />} />
            <Route path="support" element={<AdminSupport />} />
            <Route path="logs" element={<AdminActivityLogs />} />
            <Route path="help" element={<AdminHelp />} />
          </Route>

          {/* Existing public content layout */}
          <Route path="/help" element={<HelpCenter />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:id" element={<BlogDetail />} />
          <Route path="/law-details" element={<PracticeAreaLayout />}>
            <Route index element={<LawDetails />} />
          </Route>
          <Route path="/resources" element={<Resources />} />
          <Route path="/knowledge" element={<KnowledgeBase />} />
          <Route path="/knowledge-base" element={<Navigate to="/knowledge" replace />} />
          <Route path="/practice-areas" element={<PracticeAreaLayout />}>
            <Route index element={<PracticeAreasIndexRedirect />} />
            <Route path=":areaSlug" element={<PracticeAreaPage />} />
          </Route>
          <Route path="/case/:caseId" element={<FullCaseContent />} />
          {/* Some environments keep %20 in pathname; register both shapes. */}
          <Route path="/Nihil lorem exceptur" element={<NihilLoremExceptur />} />
          <Route path="/Nihil%20lorem%20exceptur" element={<NihilLoremExceptur />} />

          <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <AdminStoreProvider>
            <RoleHubSync />
            <AppShell />
          </AdminStoreProvider>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
