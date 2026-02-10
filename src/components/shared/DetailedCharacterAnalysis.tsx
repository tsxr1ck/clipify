import { useState } from 'react';
import { Copy, Check, Wand2, Sparkles, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
// Since the frontend runs in browser, we can't import directly from server services. 
// We should probably duplicate the utility functions to a shared utils file or just rewrite them here. 
// For now, I'll rewrite them here as utility functions within the component or a dedicated frontend service.

// Utility functions for frontend
export function extractAIPromptFrontend(detailedDescription: string): string {
    const promptMatch = detailedDescription.match(
        /## AI GENERATION PROMPT.*?\n(.*?)(?=\n##|\n\n##|$)/s
    );
    if (promptMatch && promptMatch[1]) {
        return promptMatch[1].trim();
    }
    return detailedDescription;
}

export function parseCharacterAnalysisFrontend(description: string) {
    const sections: Record<string, string> = {};
    const sectionRegex = /## ([^\n]+)\n([\s\S]*?)(?=\n## |$)/g;
    let match;
    while ((match = sectionRegex.exec(description)) !== null) {
        const title = match[1].trim();
        const content = match[2].trim();
        sections[title] = content;
    }
    return {
        facialStructure: sections['FACIAL STRUCTURE'] || '',
        eyes: sections['EYES (MOST CRITICAL - BE VERY DETAILED)'] || sections['EYES'] || '',
        nose: sections['NOSE'] || '',
        mouthAndLips: sections['MOUTH & LIPS'] || '',
        skin: sections['SKIN'] || '',
        hair: sections['HAIR'] || '',
        distinctiveFeatures: sections['DISTINCTIVE FEATURES'] || '',
        overallImpression: sections['OVERALL IMPRESSION'] || '',
        aiPrompt: sections['AI GENERATION PROMPT (READY TO USE)'] || sections['AI GENERATION PROMPT'] || '',
        fullAnalysis: description,
    };
}

interface DetailedCharacterAnalysisProps {
    analysis: string;
    onUsePrompt?: (prompt: string) => void;
}

export function DetailedCharacterAnalysis({ analysis, onUsePrompt }: DetailedCharacterAnalysisProps) {
    const [activeTab, setActiveTab] = useState<'prompt' | 'details'>('prompt');
    const [copied, setCopied] = useState(false);

    const parsed = parseCharacterAnalysisFrontend(analysis);
    const aiPrompt = extractAIPromptFrontend(analysis);

    const handleCopy = () => {
        navigator.clipboard.writeText(aiPrompt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleUse = () => {
        if (onUsePrompt) {
            onUsePrompt(aiPrompt);
        }
    };

    return (
        <div className="w-full glass-card overflow-hidden animate-fadeIn mt-4">
            <div className="flex border-b border-white/10">
                <button
                    onClick={() => setActiveTab('prompt')}
                    className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'prompt'
                        ? 'bg-primary/10 text-primary border-b-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                        }`}
                >
                    <Sparkles className="w-4 h-4" />
                    AI-Ready Prompt
                </button>
                <button
                    onClick={() => setActiveTab('details')}
                    className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'details'
                        ? 'bg-primary/10 text-primary border-b-2 border-primary'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                        }`}
                >
                    <FileText className="w-4 h-4" />
                    Detailed Breakdown
                </button>
            </div>

            <div className="p-4 sm:p-6">
                {activeTab === 'prompt' ? (
                    <div className="space-y-4">
                        <div className="bg-muted/30 rounded-xl p-4 border border-white/5 font-mono text-sm leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                            {aiPrompt}
                        </div>

                        <div className="flex gap-2 justify-end">
                            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-2">
                                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                {copied ? 'Copied' : 'Copy Prompt'}
                            </Button>
                            {onUsePrompt && (
                                <Button size="sm" onClick={handleUse} className="gap-2 bg-gradient-to-r from-primary to-purple-600">
                                    <Wand2 className="w-3 h-3" />
                                    Use in Generator
                                </Button>
                            )}
                        </div>

                        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg text-xs text-blue-200">
                            <strong>💡 Pro Tip:</strong> This prompt is optimized for consistency. Save it with your character to generate the exact same person in every scene!
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                        <AnalysisSection
                            title="Eyes (Critical)"
                            content={parsed.eyes}
                            icon="👁️"
                            highlight
                        />
                        <AnalysisSection title="Facial Structure" content={parsed.facialStructure} icon="👤" />
                        <AnalysisSection title="Nose" content={parsed.nose} icon="👃" />
                        <AnalysisSection title="Mouth & Lips" content={parsed.mouthAndLips} icon="👄" />
                        <AnalysisSection title="Skin" content={parsed.skin} icon="✨" />
                        <AnalysisSection title="Hair" content={parsed.hair} icon="💇‍♀️" />
                        <AnalysisSection title="Distinctive Features" content={parsed.distinctiveFeatures} icon="⭐" />
                        <AnalysisSection title="Overall Impression" content={parsed.overallImpression} icon="📝" />
                    </div>
                )}
            </div>
        </div>
    );
}

function AnalysisSection({ title, content, icon, highlight }: { title: string, content: string, icon: string, highlight?: boolean }) {
    if (!content) return null;

    // Convert bullet points to list items
    const items = content.split('\n').filter(line => line.trim().length > 0);

    return (
        <div className={`p-4 rounded-xl border ${highlight ? 'bg-amber-500/5 border-amber-500/30' : 'bg-muted/10 border-white/5'}`}>
            <h3 className={`font-semibold mb-3 flex items-center gap-2 ${highlight ? 'text-amber-400' : 'text-foreground'}`}>
                <span>{icon}</span> {title}
            </h3>
            <ul className="space-y-2">
                {items.map((item, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-primary/50 shrink-0" />
                        <span>{item.replace(/^- /, '')}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
