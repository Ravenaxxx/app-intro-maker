import { useState } from "react";
import { Search, Loader2, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { firecrawlApi } from "@/lib/api/firecrawl";
import { toast } from "sonner";

interface SearchResult {
  url: string;
  title: string;
  description?: string;
}

interface ArticleSearchProps {
  onSelectArticle: (article: { url: string; title: string; markdown: string; screenshot?: string }) => void;
}

export const ArticleSearch = ({ onSelectArticle }: ArticleSearchProps) => {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [scrapingUrl, setScrapingUrl] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setResults([]);

    try {
      const response = await firecrawlApi.search(query, { limit: 8 });

      if (response.success && response.data) {
        const searchResults = response.data.map((item: any) => ({
          url: item.url,
          title: item.title || item.url,
          description: item.description,
        }));
        setResults(searchResults);

        if (searchResults.length === 0) {
          toast.info("Aucun résultat trouvé", {
            description: "Essayez une autre recherche",
          });
        }
      } else {
        toast.error("Erreur de recherche", {
          description: response.error || "Impossible de rechercher les articles",
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Erreur de connexion", {
        description: "Vérifiez votre connexion internet",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = async (result: SearchResult) => {
    setIsScraping(true);
    setScrapingUrl(result.url);

    try {
      const response = await firecrawlApi.scrape(result.url);

      if (response.success && response.data) {
        onSelectArticle({
          url: result.url,
          title: result.title,
          markdown: response.data.markdown || "",
          screenshot: response.data.screenshot,
        });
        toast.success("Article chargé", {
          description: result.title,
        });
      } else {
        toast.error("Erreur de chargement", {
          description: response.error || "Impossible de charger l'article",
        });
      }
    } catch (error) {
      console.error("Scrape error:", error);
      toast.error("Erreur de connexion", {
        description: "Impossible de charger l'article",
      });
    } finally {
      setIsScraping(false);
      setScrapingUrl(null);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un article (ex: actualités tech, blog voyage...)"
            className="pl-10"
            disabled={isSearching || isScraping}
          />
        </div>
        <Button type="submit" disabled={isSearching || isScraping || !query.trim()}>
          {isSearching ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Recherche...
            </>
          ) : (
            "Rechercher"
          )}
        </Button>
      </form>

      {results.length > 0 && (
        <ScrollArea className="h-[300px]">
          <div className="space-y-2 pr-4">
            {results.map((result, index) => (
              <Card
                key={index}
                className={`p-4 cursor-pointer transition-all hover:border-primary/50 hover:bg-accent/50 ${
                  scrapingUrl === result.url ? "border-primary bg-accent" : ""
                }`}
                onClick={() => !isScraping && handleSelectResult(result)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-2 text-foreground">
                      {result.title}
                    </h4>
                    {result.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {result.description}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground/70 mt-1 truncate">
                      {result.url}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {scrapingUrl === result.url ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : (
                      <ExternalLink className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {results.length > 0 && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setResults([]);
              setQuery("");
            }}
            disabled={isScraping}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Nouvelle recherche
          </Button>
        </div>
      )}
    </div>
  );
};
