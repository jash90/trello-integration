import React from 'react';
import { Check } from 'lucide-react';

interface ModelSelectorProps {
  selectedModel: string;
  onModelSelect: (model: string) => void;
}

const MODELS = [
  { id: 'o3-mini', label: 'O3 Mini'},
  { id: 'o1', label: 'O1' },
  { id: 'o1-preview', label: 'O1 Preview' },
  { id: 'o1-mini', label: 'O1 Mini'},
  { id: 'gpt-4o', label: 'GPT-4O' },
  { id: 'gpt-4o-mini', label: 'GPT-4O Mini' },
  { id: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
];

export function ModelSelector({ selectedModel, onModelSelect }: ModelSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {MODELS.map((model) => (
        <button
          key={model.id}
          onClick={() => onModelSelect(model.id)}
          className={`
            inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium
            transition-colors duration-200 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500
            ${
              selectedModel === model.id
                ? 'bg-purple-100 text-purple-800 border-2 border-purple-500'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border-2 border-transparent'
            }
          `}
          aria-pressed={selectedModel === model.id}
        >
          {selectedModel === model.id && (
            <Check className="w-4 h-4 mr-1 text-purple-600" />
          )}
          {model.label}
        </button>
      ))}
    </div>
  );
}