import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ListPlus, Sparkles, Users, FileJson, ChevronRight } from 'lucide-react';

type FeatureTab = 'create' | 'ai' | 'edit' | 'export';

interface Feature {
  id: FeatureTab;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  details: string;
}

export function LandingPage() {
  const [activeTab, setActiveTab] = useState<FeatureTab>('create');
  
  const features: Feature[] = [
    {
      id: 'create',
      title: 'Task Creation',
      description: 'Create and manage Trello tasks with ease',
      icon: <ListPlus className="w-6 h-6" />,
      color: 'bg-blue-500',
      details: 'Quickly create tasks and add them to your Trello boards. Specify task details, assign members, and organize your workflow without leaving the app.'
    },
    {
      id: 'ai',
      title: 'AI-Powered Generation',
      description: 'Generate tasks using OpenAI',
      icon: <Sparkles className="w-6 h-6" />,
      color: 'bg-purple-500',
      details: 'Leverage OpenAI to automatically generate tasks based on your prompts. Our AI integration helps you break down projects, create work items, and save time on manual task creation.'
    },
    {
      id: 'edit',
      title: 'Bulk Editing',
      description: 'Edit multiple tasks at once',
      icon: <Users className="w-6 h-6" />,
      color: 'bg-green-500',
      details: 'Select multiple tasks and edit them simultaneously. Assign team members in bulk, update properties across multiple cards, and streamline your project management workflow.'
    },
    {
      id: 'export',
      title: 'JSON Export',
      description: 'Export tasks as JSON for other tools',
      icon: <FileJson className="w-6 h-6" />,
      color: 'bg-amber-500',
      details: 'Export your tasks as structured JSON data for use in other tools and systems. Easily integrate with external applications, backup your data, or transform it for reporting.'
    }
  ];
  
  const activeFeature = features.find(f => f.id === activeTab) || features[0];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <ListPlus className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-2xl font-bold text-gray-900">Trello Task Creator</h1>
            </div>
            <Link
              to="/dashboard"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Go to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <div className="py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
              Streamline Your Trello Workflow
            </h1>
            <p className="mt-5 max-w-xl mx-auto text-xl text-gray-500">
              Create, manage, and automate your Trello tasks with AI-powered assistance
            </p>
            <div className="mt-8 flex justify-center">
              <Link
                to="/dashboard"
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Get Started <ChevronRight className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section with Tabs */}
      <div className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Powerful Features
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
              Everything you need to manage your Trello tasks efficiently
            </p>
          </div>

          {/* Tabs */}
          <div className="mt-12">
            <div className="flex overflow-x-auto space-x-4 pb-4 sm:justify-center">
              {features.map((feature) => (
                <button
                  key={feature.id}
                  onClick={() => setActiveTab(feature.id)}
                  className={`flex flex-col items-center px-5 py-3 rounded-lg transition ${
                    activeTab === feature.id
                      ? `${feature.color} text-white`
                      : 'bg-white hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {feature.icon}
                  <span className="mt-2 text-sm font-medium">{feature.title}</span>
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="mt-8 bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-8">
                <div className="flex items-center">
                  <div className={`p-3 rounded-md ${activeFeature.color}`}>
                    {activeFeature.icon}
                  </div>
                  <div className="ml-4">
                    <h3 className="text-xl font-medium text-gray-900">{activeFeature.title}</h3>
                    <p className="text-gray-500">{activeFeature.description}</p>
                  </div>
                </div>
                <div className="mt-6">
                  <p className="text-gray-700 leading-relaxed">{activeFeature.details}</p>
                </div>
                <div className="mt-8">
                  <Link
                    to="/dashboard"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Try this feature <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-700">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            <span className="block">Ready to get started?</span>
            <span className="block text-blue-200">Start using Trello Task Creator today.</span>
          </h2>
          <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
            <div className="inline-flex rounded-md shadow">
              <Link
                to="/dashboard"
                className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-blue-50"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 md:flex md:items-center md:justify-between lg:px-8">
          <div className="flex justify-center space-x-6 md:order-2">
            <a href="https://github.com" className="text-gray-400 hover:text-gray-500">
              <span className="sr-only">GitHub</span>
              <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
          <div className="mt-8 md:mt-0 md:order-1">
            <p className="text-center text-base text-gray-400">
              &copy; {new Date().getFullYear()} Trello Task Creator. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
} 