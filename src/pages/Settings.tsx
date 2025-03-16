import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Key, RefreshCw, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { UserSettings } from '../lib/supabase';
import { LogoutButton } from '../components/LogoutButton';
import toast from 'react-hot-toast';

interface ApiKeyFormProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onTest: () => Promise<boolean>;
  isLoading: boolean;
  icon: React.ReactNode;
}

function ApiKeyForm({ label, value, onChange, onTest, isLoading, icon }: ApiKeyFormProps) {
  const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');

  const handleTest = async () => {
    setStatus('testing');
    try {
      const success = await onTest();
      setStatus(success ? 'success' : 'error');
      setTimeout(() => setStatus('idle'), 3000);
    } catch {
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
          <input
            type="password"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder={`Enter your ${label}`}
          />
        </div>
        <button
          type="button"
          onClick={handleTest}
          disabled={!value || isLoading || status === 'testing'}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
        >
          {status === 'testing' ? (
            <Loader2 className="animate-spin h-5 w-5" />
          ) : status === 'success' ? (
            <CheckCircle className="h-5 w-5 text-white" />
          ) : status === 'error' ? (
            <XCircle className="h-5 w-5 text-white" />
          ) : (
            <RefreshCw className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}

export function Settings() {
  const [settings, setSettings] = useState<Partial<UserSettings>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('No user found');

      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code === 'PGRST116') {
        // No settings found, create initial settings
        const { data: newData, error: insertError } = await supabase
          .from('user_settings')
          .insert({ user_id: user.id })
          .select()
          .single();

        if (insertError) throw insertError;
        if (newData) setSettings(newData);
      } else if (error) {
        throw error;
      } else if (data) {
        setSettings(data);
      }
    } catch (error) {
      toast.error('Failed to load settings');
      console.error('Settings error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          ...settings
        });

      if (error) throw error;
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const testOpenAIKey = async () => {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${settings.openai_key}`
        }
      });
      return response.ok;
    } catch {
      return false;
    }
  };

  const testTrelloCredentials = async () => {
    try {
      const response = await fetch(
        `https://api.trello.com/1/members/me/boards?key=${settings.trello_key}&token=${settings.trello_token}`
      );
      return response.ok;
    } catch {
      return false;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">API Settings</h1>
          </div>
          <LogoutButton />
        </div>

        <div className="bg-white shadow rounded-lg p-6 space-y-6">
          <ApiKeyForm
            label="OpenAI API Key"
            value={settings.openai_key || ''}
            onChange={(value) => setSettings({ ...settings, openai_key: value })}
            onTest={testOpenAIKey}
            isLoading={isSaving}
            icon={<Key className="h-5 w-5 text-gray-400" />}
          />

          <div className="space-y-4">
            <ApiKeyForm
              label="Trello API Key"
              value={settings.trello_key || ''}
              onChange={(value) => setSettings({ ...settings, trello_key: value })}
              onTest={testTrelloCredentials}
              isLoading={isSaving}
              icon={<Key className="h-5 w-5 text-gray-400" />}
            />

            <ApiKeyForm
              label="Trello Token"
              value={settings.trello_token || ''}
              onChange={(value) => setSettings({ ...settings, trello_token: value })}
              onTest={testTrelloCredentials}
              isLoading={isSaving}
              icon={<Key className="h-5 w-5 text-gray-400" />}
            />
          </div>

          {settings.last_updated && (
            <p className="text-sm text-gray-500">
              Last updated: {new Date(settings.last_updated).toLocaleString()}
            </p>
          )}

          <div className="pt-4">
            <button
              onClick={saveSettings}
              disabled={isSaving}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
            >
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}