import { Globe } from "lucide-react";
import { ArticleSearch } from "./ArticleSearch";
import { ArticlePreview } from "./ArticlePreview";

interface Article {
  url: string;
  title: string;
  markdown: string;
  screenshot?: string;
}

interface ArticleSectionProps {
  article: Article | null;
  onSelectArticle: (article: Article) => void;
  onClearArticle: () => void;
}

export const ArticleSection = ({ article, onSelectArticle, onClearArticle }: ArticleSectionProps) => {
  return (
    <section className="glass-panel rounded-2xl p-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <Globe className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-foreground">
          Contexte de simulation
        </h3>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Recherchez un article web pour simuler l'affichage de votre publicité dans un contexte réel.
      </p>

      {article ? (
        <ArticlePreview
          article={article}
          onClear={onClearArticle}
          onRefresh={onClearArticle}
        />
      ) : (
        <ArticleSearch onSelectArticle={onSelectArticle} />
      )}
    </section>
  );
};
