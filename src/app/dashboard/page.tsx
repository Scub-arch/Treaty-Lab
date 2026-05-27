import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TreatiesTab } from "@/components/dashboard/treaties-tab";
import { ResourcesTab } from "@/components/dashboard/resources-tab";
import { EvidenceTab } from "@/components/dashboard/evidence-tab";
import { ChatPanel } from "@/components/dashboard/chat-panel";
import {
  getTreatiesTabData,
  getAllTreatyDetails,
  getResourcesTabData,
  getEvidenceTabData,
} from "@/lib/dashboard-data";

export const runtime = "nodejs";

export const metadata = {
  title: "Dashboard — Treaty-Lab",
  description: "Multi-domain intelligence dashboard — treaties, resources, evidence.",
};

export default async function DashboardPage() {
  const [treaties, details, resources, evidence] = await Promise.all([
    getTreatiesTabData(),
    getAllTreatyDetails(),
    Promise.resolve(getResourcesTabData()),
    Promise.resolve(getEvidenceTabData()),
  ]);

  return (
    <div className="px-6 py-8 space-y-6 max-w-[1600px] mx-auto">
      {/* Page header */}
      <header className="space-y-2">
        <div className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground">
          CMD · DASHBOARD · v0.1
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
          Treaty-Lab dashboard
        </h1>
        <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
          Three-lens view of the platform: the treaty catalog (Prisma), resource indicators across
          energy/water/finance (content aggregations), and the evidence + project library
          (citation graph + reliability). Click rows in the treaty catalog to investigate
          signatures, ratifications, and topics.
        </p>
      </header>

      <Tabs defaultValue="treaties" className="gap-4">
        <TabsList variant="line" className="w-full justify-start gap-4">
          <TabsTrigger value="treaties">Treaties</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="evidence">Evidence &amp; Projects</TabsTrigger>
        </TabsList>

        <TabsContent value="treaties">
          <TreatiesTab data={treaties} detailsById={details} />
        </TabsContent>
        <TabsContent value="resources">
          <ResourcesTab data={resources} />
        </TabsContent>
        <TabsContent value="evidence">
          <EvidenceTab data={evidence} />
        </TabsContent>
      </Tabs>

      <ChatPanel />
    </div>
  );
}
