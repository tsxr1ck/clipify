import { Loader2, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileCostBarProps {
  cost: number;
  isValid: boolean;
  onGenerate: () => void;
  isGenerating: boolean;
}

export function MobileCostBar({
  cost,
  isValid,
  onGenerate,
  isGenerating
}: MobileCostBarProps) {
  return (
    <div className="lg:hidden fixed bottom-16 left-0 right-0 z-30 glass border-t border-border">
      <div className="flex items-center gap-3 p-3">
        {/* Cost Display */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg glass flex-1">
          <DollarSign className="w-4 h-4 text-primary" />
          <div>
            <p className="text-xs text-muted-foreground">Estimated Cost</p>
            <p className="text-sm font-bold gradient-text">
              ${cost.toFixed(2)} MXN
            </p>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={onGenerate}
          disabled={!isValid || isGenerating}
          className="btn-gradient h-11 px-6 font-semibold"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Generating...
            </>
          ) : (
            'Generate Video'
          )}
        </Button>
      </div>
    </div>
  );
}
