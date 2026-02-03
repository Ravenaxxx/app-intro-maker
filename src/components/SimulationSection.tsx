import { Monitor } from "lucide-react";
import { AdSimulation } from "./AdSimulation";

interface AdAsset {
  id: string;
  name: string;
  url: string;
  type: "video" | "image";
}

interface Article {
  url: string;
  title: string;
  markdown: string;
  screenshot?: string;
}

interface SimulationSectionProps {
  article: Article;
  adAsset: AdAsset;
}

export const SimulationSection = ({ article, adAsset }: SimulationSectionProps) => {
  return (
    <section className="glass-panel rounded-2xl p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <Monitor className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">
          Simulation publicitaire
        </h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Visualisez comment votre publicité apparaîtra sur l'article sélectionné.
      </p>

      <AdSimulation article={article} adAsset={adAsset} />
    </section>
  );
};
