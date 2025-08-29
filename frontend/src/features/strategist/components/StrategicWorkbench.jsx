/**
 * StrategicWorkbench.jsx - Campaign Playbooks and Communications Center
 * 
 * Features:
 * - Pre-built campaign playbooks and templates
 * - Communication strategy templates and talking points
 * - Real-time content generation and customization
 * - Crisis communication protocols and rapid response
 * - Social media content planning and scheduling
 * - Press release and statement drafting
 * - Integration with ward-specific data and intelligence
 * - Collaboration tools for campaign team coordination
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BookOpen,
  FileText,
  Edit3,
  Copy,
  Download,
  Share2,
  Plus,
  Search,
  Filter,
  Clock,
  Users,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle,
  Eye,
  Settings,
  Bookmark,
  Tag,
  Calendar,
  MessageSquare,
  Megaphone,
  TrendingUp,
  Shield,
  Lightbulb,
  Trash2,
  Star,
  Archive,
  RefreshCw
} from 'lucide-react';
import { useWard } from '../../../context/WardContext';

const WORKBENCH_CATEGORIES = {
  playbooks: {
    icon: BookOpen,
    label: 'Campaign Playbooks',
    color: 'text-blue-600',
    description: 'Strategic campaign guides and frameworks'
  },
  communications: {
    icon: Megaphone,
    label: 'Communications',
    color: 'text-green-600',
    description: 'Messaging templates and talking points'
  },
  crisis: {
    icon: Shield,
    label: 'Crisis Response',
    color: 'text-red-600',
    description: 'Emergency protocols and rapid response'
  },
  social: {
    icon: MessageSquare,
    label: 'Social Media',
    color: 'text-purple-600',
    description: 'Social content planning and scheduling'
  },
  press: {
    icon: FileText,
    label: 'Press & Media',
    color: 'text-orange-600',
    description: 'Press releases and media statements'
  },
  events: {
    icon: Calendar,
    label: 'Event Planning',
    color: 'text-indigo-600',
    description: 'Event scripts and coordination tools'
  }
};

const TEMPLATE_TYPES = {
  playbook: { icon: BookOpen, label: 'Playbook', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  template: { icon: FileText, label: 'Template', color: 'bg-green-50 text-green-700 border-green-200' },
  protocol: { icon: Shield, label: 'Protocol', color: 'bg-red-50 text-red-700 border-red-200' },
  script: { icon: MessageSquare, label: 'Script', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  checklist: { icon: CheckCircle, label: 'Checklist', color: 'bg-orange-50 text-orange-700 border-orange-200' }
};

const SAMPLE_TEMPLATES = [
  {
    id: 1,
    title: 'Infrastructure Development Campaign Playbook',
    category: 'playbooks',
    type: 'playbook',
    description: 'Comprehensive strategy for campaigning on infrastructure improvements',
    tags: ['infrastructure', 'development', 'strategy'],
    lastModified: '2025-08-22T10:30:00Z',
    author: 'Campaign Strategy Team',
    usageCount: 45,
    rating: 4.8,
    content: `# Infrastructure Development Campaign Playbook

## Executive Summary
This playbook provides a comprehensive strategy for positioning yourself as the infrastructure development candidate.

## Key Messages
1. **Proven Delivery Track Record**
   - Highlight completed projects
   - Quantify improvements and benefits
   - Show before/after comparisons

2. **Community-First Approach**
   - Emphasize resident consultation
   - Local contractor preference
   - Transparent progress updates

## Strategic Framework
### Phase 1: Foundation Building (Weeks 1-2)
- Audit current infrastructure status
- Identify priority improvement areas
- Engage community stakeholders

### Phase 2: Visibility Campaign (Weeks 3-6)
- Launch "Infrastructure Tour" initiative
- Document current challenges
- Propose specific solutions

### Phase 3: Implementation Promise (Weeks 7-8)
- Present detailed action plan
- Timeline for improvements
- Budget allocation transparency

## Talking Points
- "Infrastructure is the foundation of community prosperity"
- "Every road, every bridge, every utility line affects daily life"
- "Smart infrastructure investment creates lasting value"

## Supporting Data Points
- Current infrastructure condition scores
- Cost-benefit analysis of proposed improvements
- Comparison with neighboring wards
- Economic impact projections`
  },
  {
    id: 2,
    title: 'Town Hall Meeting Script Template',
    category: 'communications',
    type: 'script',
    description: 'Professional template for conducting effective town hall meetings',
    tags: ['town hall', 'public speaking', 'community engagement'],
    lastModified: '2025-08-22T09:15:00Z',
    author: 'Communications Team',
    usageCount: 32,
    rating: 4.6,
    content: `# Town Hall Meeting Script Template

## Opening (5 minutes)
"Good evening, and thank you all for taking the time to join us tonight. I'm [Name], and I'm honored to be here with you in [Ward Name] to discuss the issues that matter most to our community.

Tonight's format is simple: I'll share some brief updates on key initiatives, and then we'll open the floor for your questions, concerns, and suggestions. This is your time to be heard."

## Key Updates Section (10 minutes)
### Infrastructure Progress
- [Specific project updates]
- [Timeline confirmations]
- [Budget status]

### Community Services
- [Service improvements]
- [New initiatives]
- [Performance metrics]

## Community Q&A Guidelines
1. **Listen First**: Let residents fully express their concerns
2. **Acknowledge**: "Thank you for raising this important issue"
3. **Respond Specifically**: Provide concrete next steps or timelines
4. **Follow Up**: "Let me get your contact information so I can update you directly"

## Difficult Questions Response Framework
### When You Don't Know
"That's an excellent question that deserves a thorough answer. Let me research this properly and get back to you within [timeframe]."

### When Policy is Complex
"This involves several moving parts. Let me break this down step by step..."

### When There's Opposition
"I understand there are different perspectives on this issue. Here's how I see it, and I'd like to hear your thoughts..."

## Closing (3 minutes)
"Thank you for your engagement tonight. Your input helps shape better decisions for our ward. Here's how you can stay connected: [contact information]

Remember, this conversation doesn't end here. My door is always open, and I look forward to continuing our work together to make [Ward Name] an even better place to live, work, and raise families."

## Post-Meeting Actions
- [ ] Compile all questions and concerns
- [ ] Follow up on commitments made
- [ ] Send summary to attendees
- [ ] Update issue tracking system`
  },
  {
    id: 3,
    title: 'Crisis Communication Protocol',
    category: 'crisis',
    type: 'protocol',
    description: 'Step-by-step guide for managing political crises and negative publicity',
    tags: ['crisis', 'emergency', 'communications', 'damage control'],
    lastModified: '2025-08-22T08:45:00Z',
    author: 'Crisis Management Team',
    usageCount: 18,
    rating: 4.9,
    content: `# Crisis Communication Protocol

## Immediate Response (First 30 minutes)
### Assessment Phase
1. **Gather Facts**: Collect accurate information about the situation
2. **Assess Impact**: Determine scope and potential consequences
3. **Legal Review**: Consult legal counsel if necessary
4. **Stakeholder Mapping**: Identify affected parties

### Response Team Activation
- Communications Director
- Campaign Manager
- Legal Counsel (if needed)
- Key Advisors

## First Hour Actions
### Internal Communication
- Brief all team members on approved messaging
- Establish single spokesperson protocol
- Set up crisis monitoring system

### External Response Framework
#### Option 1: Full Acknowledgment
"We are aware of [situation] and are taking it very seriously. We are currently gathering all the facts and will provide a comprehensive response within [timeframe]."

#### Option 2: Factual Correction
"There are inaccuracies in recent reports about [situation]. Here are the facts: [accurate information]."

#### Option 3: Investigation Mode
"We are investigating the circumstances surrounding [situation] and will share our findings once the review is complete."

## 24-Hour Strategy
### Comprehensive Response Development
1. **Full Fact Gathering**: Complete investigation
2. **Message Crafting**: Develop detailed response
3. **Stakeholder Outreach**: Contact affected parties
4. **Media Strategy**: Proactive media engagement

### Key Message Components
- Acknowledgment of concern
- Statement of values
- Corrective actions taken
- Commitment to transparency
- Future prevention measures

## Long-term Recovery Plan
### Week 1: Damage Control
- Address immediate concerns
- Demonstrate accountability
- Begin relationship repair

### Week 2-4: Rebuilding Trust
- Consistent action delivery
- Transparent updates
- Community engagement

### Month 2+: Strengthening Position
- Policy improvements
- Enhanced transparency measures
- Proactive communication

## Crisis Prevention
### Early Warning Systems
- Social media monitoring
- Stakeholder feedback loops
- Regular vulnerability assessments
- Proactive issue management

### Preparation Measures
- Pre-drafted response templates
- Contact lists updated quarterly
- Regular team training
- Scenario planning exercises`
  },
  {
    id: 4,
    title: 'Social Media Content Calendar Template',
    category: 'social',
    type: 'template',
    description: 'Strategic social media planning and content scheduling framework',
    tags: ['social media', 'content', 'scheduling', 'engagement'],
    lastModified: '2025-08-22T07:20:00Z',
    author: 'Digital Team',
    usageCount: 67,
    rating: 4.7,
    content: `# Social Media Content Calendar Template

## Weekly Content Structure

### Monday: Motivation & Vision
**Content Type**: Inspirational posts about community vision
**Tone**: Optimistic, forward-looking
**Example**: "Starting the week with renewed commitment to making [Ward] a place where every family can thrive. Here's what we're working on..."

### Tuesday: Transparency Tuesday
**Content Type**: Policy updates, decision explanations
**Tone**: Educational, accessible
**Example**: "Behind the scenes of yesterday's infrastructure meeting. Here's what was discussed and what it means for you..."

### Wednesday: Ward Wednesday
**Content Type**: Community spotlights, local business features
**Tone**: Celebratory, community-focused
**Example**: "Celebrating the incredible work of [Local Business/Organization] in our community..."

### Thursday: Thoughtful Thursday
**Content Type**: Position papers, detailed policy discussions
**Tone**: Analytical, substantive
**Example**: "Our three-pronged approach to traffic management: technology, policy, and community engagement..."

### Friday: Future Friday
**Content Type**: Upcoming events, announcements
**Tone**: Anticipatory, engaging
**Example**: "Looking ahead to next week: Community coffee at [Location], infrastructure tour, and more..."

### Weekend: Community Connection
**Content Type**: Event coverage, casual community interactions
**Tone**: Personal, accessible
**Example**: "Great conversations at today's farmers market. Thank you to everyone who stopped by to chat..."

## Content Categories (70/20/10 Rule)
### 70% Community Value
- Policy explanations
- Service updates
- Educational content
- Community spotlights

### 20% Behind the Scenes
- Meeting insights
- Decision processes
- Day-in-the-life content
- Team introductions

### 10% Personal
- Personal reflections
- Family/community life
- Casual interactions
- Humanizing content

## Engagement Strategy
### Response Timeframes
- Comments: Within 2 hours during business hours
- Direct messages: Within 1 hour during business hours
- Crisis situations: Within 30 minutes

### Engagement Best Practices
1. **Always be helpful**: Provide useful information
2. **Stay professional**: Maintain dignified tone
3. **Be human**: Show personality while remaining appropriate
4. **Bridge to action**: Guide online engagement to offline participation

## Crisis Social Media Protocol
### Immediate Actions (First 15 minutes)
1. Pause all scheduled content
2. Assess situation severity
3. Craft initial response if needed
4. Monitor mentions and hashtags

### Content Adjustments
- Suspend promotional content
- Focus on factual information
- Increase monitoring frequency
- Prepare comprehensive response

## Performance Metrics
### Weekly Tracking
- Engagement rate
- Reach and impressions
- Click-through rates
- Follower growth
- Share/save rates

### Monthly Analysis
- Content performance by type
- Audience growth trends
- Best performing posts
- Engagement quality assessment
- Strategy optimization recommendations`
  }
];

const StrategicWorkbench = () => {
  const { currentWard } = useWard();
  const [selectedCategory, setSelectedCategory] = useState('playbooks');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [favorites, setFavorites] = useState(new Set());
  const [sortBy, setSortBy] = useState('lastModified');
  const [filterBy, setFilterBy] = useState('all');

  // Filter and sort templates
  const filteredTemplates = useMemo(() => {
    let filtered = SAMPLE_TEMPLATES.filter(template => {
      const matchesCategory = template.category === selectedCategory;
      const matchesSearch = searchTerm === '' || 
        template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesFilter = filterBy === 'all' || 
        (filterBy === 'favorites' && favorites.has(template.id)) ||
        template.type === filterBy;
      
      return matchesCategory && matchesSearch && matchesFilter;
    });

    // Sort templates
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.title.localeCompare(b.title);
        case 'rating':
          return b.rating - a.rating;
        case 'usage':
          return b.usageCount - a.usageCount;
        case 'lastModified':
        default:
          return new Date(b.lastModified) - new Date(a.lastModified);
      }
    });

    return filtered;
  }, [selectedCategory, searchTerm, filterBy, sortBy, favorites]);

  // Handle template selection
  const handleTemplateSelect = useCallback((template) => {
    setSelectedTemplate(template);
    setEditContent(template.content);
    setIsEditing(false);
  }, []);

  // Handle favorite toggle
  const toggleFavorite = useCallback((templateId) => {
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(templateId)) {
        newFavorites.delete(templateId);
      } else {
        newFavorites.add(templateId);
      }
      return newFavorites;
    });
  }, []);

  // Copy content to clipboard
  const copyContent = useCallback((content) => {
    navigator.clipboard.writeText(content);
  }, []);

  // Download content as file
  const downloadContent = useCallback((template) => {
    const blob = new Blob([template.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.title.toLowerCase().replace(/\s+/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  // Customize content for current ward
  const customizeContent = useCallback((content) => {
    if (!currentWard) return content;
    
    return content
      .replace(/\[Ward Name\]/g, currentWard)
      .replace(/\[Ward\]/g, currentWard)
      .replace(/\[Name\]/g, '[Your Name]')
      .replace(/\[Location\]/g, `[Location in ${currentWard}]`);
  }, [currentWard]);

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Render template card
  const renderTemplateCard = (template) => {
    const typeInfo = TEMPLATE_TYPES[template.type];
    const TypeIcon = typeInfo.icon;
    const isFavorite = favorites.has(template.id);

    return (
      <div
        key={template.id}
        className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => handleTemplateSelect(template)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className={`px-2 py-1 rounded text-xs font-medium border ${typeInfo.color}`}>
              <TypeIcon className="h-3 w-3 inline mr-1" />
              {typeInfo.label}
            </div>
            {template.rating && (
              <div className="flex items-center space-x-1 text-xs text-gray-500">
                <Star className="h-3 w-3 text-yellow-400 fill-current" />
                <span>{template.rating}</span>
              </div>
            )}
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(template.id);
            }}
            className={`p-1 rounded transition-colors ${
              isFavorite ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'
            }`}
          >
            <Star className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>
        
        <h3 className="font-medium text-gray-900 mb-2">{template.title}</h3>
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{template.description}</p>
        
        <div className="flex flex-wrap gap-1 mb-3">
          {template.tags.slice(0, 3).map(tag => (
            <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
              {tag}
            </span>
          ))}
          {template.tags.length > 3 && (
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
              +{template.tags.length - 3}
            </span>
          )}
        </div>
        
        <div className="flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-1">
              <Clock className="h-3 w-3" />
              <span>{formatDate(template.lastModified)}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Users className="h-3 w-3" />
              <span>{template.usageCount} uses</span>
            </div>
          </div>
          <span className="text-gray-400">{template.author}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-900">Strategic Workbench</h2>
            {currentWard && (
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                {currentWard}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <button className="p-2 text-gray-600 hover:text-gray-800 transition-colors">
              <Plus className="h-4 w-4" />
            </button>
            <button className="p-2 text-gray-600 hover:text-gray-800 transition-colors">
              <Settings className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Category Navigation */}
      <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-1 overflow-x-auto">
          {Object.entries(WORKBENCH_CATEGORIES).map(([key, category]) => {
            const CategoryIcon = category.icon;
            const isSelected = selectedCategory === key;
            
            return (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  isSelected
                    ? 'bg-white text-blue-600 shadow-sm border border-blue-200'
                    : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                <CategoryIcon className="h-4 w-4" />
                <span>{category.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex h-[600px]">
        {/* Template List */}
        <div className="w-1/2 border-r border-gray-200 flex flex-col">
          {/* Search and Filters */}
          <div className="p-4 border-b border-gray-200 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="lastModified">Recently Modified</option>
                <option value="title">Title A-Z</option>
                <option value="rating">Highest Rated</option>
                <option value="usage">Most Used</option>
              </select>
              
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1"
              >
                <option value="all">All Types</option>
                <option value="favorites">Favorites</option>
                <option value="playbook">Playbooks</option>
                <option value="template">Templates</option>
                <option value="protocol">Protocols</option>
                <option value="script">Scripts</option>
                <option value="checklist">Checklists</option>
              </select>
            </div>
          </div>
          
          {/* Templates Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-900">No Templates Found</h3>
                <p className="text-gray-500">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredTemplates.map(renderTemplateCard)}
              </div>
            )}
          </div>
        </div>

        {/* Template Viewer/Editor */}
        <div className="w-1/2 flex flex-col">
          {selectedTemplate ? (
            <>
              {/* Template Header */}
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {selectedTemplate.title}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedTemplate.description}
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setIsEditing(!isEditing)}
                      className={`p-2 rounded-lg transition-colors ${
                        isEditing ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:text-gray-800'
                      }`}
                      title={isEditing ? 'View mode' : 'Edit mode'}
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => copyContent(customizeContent(editContent))}
                      className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                      title="Copy content"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => downloadContent(selectedTemplate)}
                      className="p-2 text-gray-600 hover:text-gray-800 transition-colors"
                      title="Download template"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Template Content */}
              <div className="flex-1 overflow-hidden">
                {isEditing ? (
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-full p-4 border-none resize-none focus:outline-none font-mono text-sm"
                    placeholder="Edit template content..."
                  />
                ) : (
                  <div className="h-full overflow-y-auto p-4">
                    <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                      {customizeContent(selectedTemplate.content)}
                    </pre>
                  </div>
                )}
              </div>
              
              {/* Template Footer */}
              <div className="p-4 border-t border-gray-200 bg-gray-50">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-4">
                    <span>Modified: {formatDate(selectedTemplate.lastModified)}</span>
                    <span>Author: {selectedTemplate.author}</span>
                    <span>Uses: {selectedTemplate.usageCount}</span>
                  </div>
                  {currentWard && (
                    <span className="text-blue-600">
                      Customized for {currentWard}
                    </span>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Select a Template
                </h3>
                <p className="text-gray-500">
                  Choose a template from the left to view and customize it
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StrategicWorkbench;