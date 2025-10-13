import React, { useState } from 'react';
import '../App.css';
import { personalityService } from '../services/apiService';

const PersonalityCreator = () => {
  const [formData, setFormData] = useState({
    // Basic Identity
    name: '',
    age: '',
    location: '',
    occupation: '',
    background: '',
    
    // Personality Traits
    personality_type: '',
    tone: '',
    humor_style: '',
    formality_level: '',
    
    // Voice & Style
    writing_style: '',
    vocabulary_level: '',
    sentence_structure: '',
    emoji_usage: '',
    slang_usage: '',
    
    // Interests & Expertise
    main_topics: '',
    expertise_areas: '',
    hobbies: '',
    passions: '',
    
    // Values & Beliefs
    core_values: '',
    political_stance: '',
    causes_supported: '',
    controversial_topics: '',
    
    // Communication Style
    greeting_style: '',
    conversation_approach: '',
    response_length: '',
    question_frequency: '',
    
    // Content Preferences
    content_themes: '',
    post_frequency: '',
    preferred_formats: '',
    hashtag_style: '',
    
    // Engagement Style
    engagement_approach: '',
    controversy_level: '',
    authenticity_level: '',
    
    // Examples
    example_posts: '',
    example_responses: '',
    favorite_phrases: '',
    words_to_avoid: '',
    
    // Goals & Audience
    target_audience: '',
    content_goals: '',
    brand_alignment: '',
    
    // Boundaries & Restrictions
    topics_to_avoid: '',
    language_restrictions: '',
    brand_guidelines: '',
    
    // Reference Content
    threads_links: ''
  });

  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('');

    try {
        const result = await personalityService.createPersonality(formData);
        if (result.success) {
        setStatus(`✅ Personality context created successfully! File: ${result.data.filename}`);
        } 
        else {
        setStatus(`❌ Error: ${result.error || 'Failed to create personality'}`);
        }
    } catch (error) {
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const sections = [
    {
      title: "Basic Identity",
      fields: [
        { name: 'name', label: 'Character Name', placeholder: 'e.g., Alex the Tech Enthusiast', type: 'text' },
        { name: 'age', label: 'Age Range', placeholder: 'e.g., Mid-20s, 35-40, Gen Z', type: 'text' },
        { name: 'location', label: 'Location/Region', placeholder: 'e.g., San Francisco, Remote/Global, Brooklyn', type: 'text' },
        { name: 'occupation', label: 'Occupation/Role', placeholder: 'e.g., Software Engineer, Content Creator, Entrepreneur', type: 'text' },
        { name: 'background', label: 'Background Story', placeholder: 'Brief background that shapes this persona...', type: 'textarea', rows: 4 }
      ]
    },
    {
      title: "Personality Traits",
      fields: [
        { name: 'personality_type', label: 'Personality Type', placeholder: 'e.g., ENFP, Introverted creator, Extroverted networker', type: 'text' },
        { name: 'tone', label: 'Overall Tone', placeholder: 'e.g., Friendly and approachable, Professional yet warm, Sarcastic but helpful', type: 'text' },
        { name: 'humor_style', label: 'Humor Style', placeholder: 'e.g., Self-deprecating, Witty wordplay, Dad jokes, Dark humor (none if serious)', type: 'text' },
        { name: 'formality_level', label: 'Formality Level (1-10)', placeholder: '1=Very casual/slang, 10=Extremely formal', type: 'text' }
      ]
    },
    {
      title: "Voice & Communication Style",
      fields: [
        { name: 'writing_style', label: 'Writing Style', placeholder: 'e.g., Concise and punchy, Long-form storyteller, Stream of consciousness', type: 'textarea', rows: 3 },
        { name: 'vocabulary_level', label: 'Vocabulary Level', placeholder: 'e.g., Simple/accessible, Technical jargon-heavy, Academic', type: 'text' },
        { name: 'sentence_structure', label: 'Sentence Structure', placeholder: 'e.g., Short punchy sentences, Complex with clauses, Mix of both', type: 'text' },
        { name: 'emoji_usage', label: 'Emoji Usage', placeholder: 'e.g., Frequent 😊✨🔥, Minimal, Never, Only professional ones', type: 'text' },
        { name: 'slang_usage', label: 'Slang & Modern Terms', placeholder: 'e.g., Heavy Gen Z slang, Mild internet speak, None', type: 'text' }
      ]
    },
    {
      title: "Interests & Expertise",
      fields: [
        { name: 'main_topics', label: 'Main Topics', placeholder: 'e.g., AI/ML, Web3, Fitness, Cooking, Travel (comma-separated)', type: 'textarea', rows: 3 },
        { name: 'expertise_areas', label: 'Areas of Expertise', placeholder: 'What they truly know deeply about...', type: 'textarea', rows: 3 },
        { name: 'hobbies', label: 'Hobbies & Side Interests', placeholder: 'e.g., Photography, Gaming, Reading sci-fi', type: 'text' },
        { name: 'passions', label: 'Passions & Causes', placeholder: 'What gets them genuinely excited?', type: 'textarea', rows: 3 }
      ]
    },
    {
      title: "Values & Worldview",
      fields: [
        { name: 'core_values', label: 'Core Values', placeholder: 'e.g., Transparency, Innovation, Community, Sustainability', type: 'textarea', rows: 3 },
        { name: 'political_stance', label: 'Political/Social Stance', placeholder: 'e.g., Progressive, Libertarian, Apolitical, Neutral', type: 'text' },
        { name: 'causes_supported', label: 'Causes Supported', placeholder: 'e.g., Open source, Climate action, Mental health awareness', type: 'text' },
        { name: 'controversial_topics', label: 'Stance on Controversial Topics', placeholder: 'How they handle debates, politics, divisive issues', type: 'textarea', rows: 3 }
      ]
    },
    {
      title: "Content Strategy",
      fields: [
        { name: 'content_themes', label: 'Content Themes', placeholder: 'e.g., Educational threads, Hot takes, Personal stories, Industry news', type: 'textarea', rows: 3 },
        { name: 'post_frequency', label: 'Posting Frequency', placeholder: 'e.g., Daily, 3x per week, Multiple times daily', type: 'text' },
        { name: 'preferred_formats', label: 'Preferred Formats', placeholder: 'e.g., Thread storms, Single tweets, Questions, Polls, Lists', type: 'text' },
        { name: 'hashtag_style', label: 'Hashtag Usage', placeholder: 'e.g., #Always #Tags, Minimal, Never', type: 'text' }
      ]
    },
    {
      title: "Engagement Approach",
      fields: [
        { name: 'engagement_approach', label: 'How They Engage', placeholder: 'e.g., Asks lots of questions, Shares others work, Debates respectfully', type: 'textarea', rows: 3 },
        { name: 'controversy_level', label: 'Controversy Tolerance', placeholder: 'e.g., Avoids all conflict, Embraces hot takes, Balanced', type: 'text' },
        { name: 'authenticity_level', label: 'Authenticity Level', placeholder: 'e.g., Shows vulnerability, Always polished, Mix of both', type: 'text' }
      ]
    },
    {
      title: "Reference Content (Optional)",
      description: "Paste Threads links to analyze real content for inspiration",
      fields: [
        { 
          name: 'threads_links', 
          label: 'Threads/Instagram Links', 
          placeholder: 'Paste profile or thread links (one per line):\n\nhttps://www.threads.com/@username\nhttps://www.threads.com/@username/post/ABC123\nhttps://www.instagram.com/p/ABC123/', 
          type: 'textarea', 
          rows: 6 
        }
      ]
    },
    {
      title: "Examples & Voice Samples",
      fields: [
        { name: 'example_posts', label: 'Example Posts', placeholder: 'Write 3-5 example posts in their voice:\n\nPost 1: ...\nPost 2: ...', type: 'textarea', rows: 8 },
        { name: 'example_responses', label: 'Example Responses to Comments', placeholder: 'How would they reply to:\n- A compliment\n- Criticism\n- A question', type: 'textarea', rows: 6 },
        { name: 'favorite_phrases', label: 'Favorite Phrases/Catchphrases', placeholder: 'e.g., "Here\'s the thing...", "Hot take:", "Thread 🧵👇"', type: 'textarea', rows: 3 },
        { name: 'words_to_avoid', label: 'Words/Phrases to NEVER Use', placeholder: 'e.g., "Literally", Corporate jargon, Crypto buzzwords', type: 'textarea', rows: 3 }
      ]
    },
    {
      title: "Target Audience & Goals",
      fields: [
        { name: 'target_audience', label: 'Target Audience', placeholder: 'e.g., Junior developers, Startup founders, Design enthusiasts', type: 'textarea', rows: 3 },
        { name: 'content_goals', label: 'Content Goals', placeholder: 'e.g., Educate, Entertain, Build community, Grow personal brand', type: 'textarea', rows: 3 },
        { name: 'brand_alignment', label: 'Brand Alignment', placeholder: 'If representing a brand, what are the brand values?', type: 'textarea', rows: 3 }
      ]
    },
    {
      title: "Boundaries & Restrictions",
      fields: [
        { name: 'topics_to_avoid', label: 'Topics to Avoid', placeholder: 'e.g., Politics, Religion, Specific competitors, Personal life', type: 'textarea', rows: 3 },
        { name: 'language_restrictions', label: 'Language Restrictions', placeholder: 'e.g., No profanity, Keep it PG, Edgy but tasteful', type: 'text' },
        { name: 'brand_guidelines', label: 'Brand Guidelines/Legal Constraints', placeholder: 'Any legal disclaimers, compliance requirements, etc.', type: 'textarea', rows: 3 }
      ]
    }
  ];

  return (
    <div className="personality-creator">
      <h2>🎭 AI Personality Creator</h2>
      <p className="personality-subtitle">
        Build a comprehensive personality context for your AI. The more detail you provide, 
        the more authentic and consistent the generated content will be.
      </p>

      <form onSubmit={handleSubmit}>
        {sections.map((section, idx) => (
          <div key={idx} className="personality-section">
            <h3>{section.title}</h3>
            {section.description && (
              <p className="section-description">{section.description}</p>
            )}
            <div className="personality-form-grid">
              {section.fields.map((field) => (
                <div key={field.name} className="personality-form-field">
                  <label htmlFor={field.name}>{field.label}</label>
                  {field.type === 'textarea' ? (
                    <textarea
                      id={field.name}
                      name={field.name}
                      value={formData[field.name]}
                      onChange={handleChange}
                      placeholder={field.placeholder}
                      rows={field.rows || 4}
                    />
                  ) : (
                    <input
                      type={field.type}
                      id={field.name}
                      name={field.name}
                      value={formData[field.name]}
                      onChange={handleChange}
                      placeholder={field.placeholder}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="personality-form-actions">
          <button type="submit" disabled={loading} className="personality-submit-btn">
            {loading ? 'Creating Personality...' : '💾 Create Personality Context'}
          </button>
        </div>

        {status && <div className="personality-status-message">{status}</div>}
      </form>
    </div>
  );
};

export default PersonalityCreator;  