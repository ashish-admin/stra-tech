/**
 * LokDarpan Data Quality Checker
 * Validates data quality across all API endpoints
 */

const apiBase = import.meta.env.VITE_API_BASE_URL || '';

export class DataQualityChecker {
  constructor() {
    this.results = {};
  }

  async checkEndpoint(endpoint, description) {
    try {
      const response = await fetch(`${apiBase}${endpoint}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        return {
          endpoint,
          description,
          status: 'ERROR',
          message: `HTTP ${response.status}`,
          data: null
        };
      }

      const data = await response.json();
      
      return {
        endpoint,
        description,
        status: 'SUCCESS',
        data,
        quality: this.assessDataQuality(endpoint, data)
      };
    } catch (error) {
      return {
        endpoint,
        description,
        status: 'NETWORK_ERROR',
        message: error.message,
        data: null
      };
    }
  }

  assessDataQuality(endpoint, data) {
    const quality = {
      score: 0,
      issues: [],
      recommendations: []
    };

    // Trends endpoint quality assessment
    if (endpoint.includes('/trends')) {
      const series = data?.series || [];
      if (series.length === 0) {
        quality.issues.push('No time series data available');
        quality.score = 0;
      } else {
        let validDays = 0;
        let totalPartyMentions = 0;
        let partyDiversity = new Set();

        series.forEach(day => {
          const total = day.mentions_total || 0;
          if (total > 5) validDays++; // Days with meaningful data
          
          Object.keys(day.parties || {}).forEach(party => {
            if (party !== 'Other' && (day.parties[party] || 0) > 0) {
              partyDiversity.add(party);
              totalPartyMentions += day.parties[party];
            }
          });
        });

        // Score based on data richness
        if (validDays < 10) quality.issues.push(`Only ${validDays} days have sufficient mentions (>5)`);
        if (partyDiversity.size < 3) quality.issues.push(`Only ${partyDiversity.size} parties have meaningful data`);
        if (totalPartyMentions < 50) quality.issues.push(`Low total party mentions: ${totalPartyMentions}`);
        
        quality.score = Math.min(100, 
          (validDays / series.length) * 40 + 
          (partyDiversity.size / 4) * 30 + 
          Math.min(totalPartyMentions / 200, 1) * 30
        );
      }
    }

    // Posts endpoint quality assessment  
    if (endpoint.includes('/posts')) {
      const posts = Array.isArray(data) ? data : [];
      if (posts.length === 0) {
        quality.issues.push('No posts available');
        quality.score = 0;
      } else {
        let withEmotion = 0;
        let withParty = 0;
        let withContent = 0;

        posts.forEach(post => {
          if (post.emotion) withEmotion++;
          if (post.party || post.author) withParty++;
          if (post.text && post.text.length > 50) withContent++;
        });

        quality.score = Math.min(100, 
          (withEmotion / posts.length) * 40 + 
          (withParty / posts.length) * 30 + 
          (withContent / posts.length) * 30
        );

        if (withEmotion / posts.length < 0.7) quality.issues.push(`${Math.round((withEmotion/posts.length)*100)}% posts have emotion data`);
        if (withParty / posts.length < 0.5) quality.issues.push(`${Math.round((withParty/posts.length)*100)}% posts have party affiliation`);
        if (withContent / posts.length < 0.8) quality.issues.push(`${Math.round((withContent/posts.length)*100)}% posts have substantial content`);
      }
    }

    // Competitive analysis quality assessment
    if (endpoint.includes('/competitive-analysis')) {
      const parties = Object.keys(data || {});
      if (parties.length === 0) {
        quality.issues.push('No competitive analysis data');
        quality.score = 0;
      } else {
        let totalMentions = 0;
        parties.forEach(party => {
          const emotions = data[party];
          totalMentions += Object.values(emotions).reduce((a, b) => a + b, 0);
        });

        quality.score = Math.min(100, 
          (parties.length / 5) * 50 + 
          Math.min(totalMentions / 100, 1) * 50
        );

        if (parties.length < 3) quality.issues.push(`Only ${parties.length} parties in competitive analysis`);
        if (totalMentions < 50) quality.issues.push(`Low total mentions in competitive analysis: ${totalMentions}`);
      }
    }

    return quality;
  }

  async runFullCheck() {
    console.log('🔍 Starting LokDarpan Data Quality Check...');

    const endpoints = [
      ['/api/v1/trends?ward=All&days=30', 'Time Series Trends Data'],
      ['/api/v1/trends?ward=Jubilee%20Hills&days=30', 'Ward-Specific Trends Data'],
      ['/api/v1/posts?city=All', 'Posts Feed Data'],
      ['/api/v1/posts?city=Jubilee%20Hills', 'Ward-Specific Posts'],
      ['/api/v1/competitive-analysis?city=All', 'Competitive Analysis Data'],
      ['/api/v1/geojson', 'Geographic Boundary Data'],
      ['/api/v1/status', 'System Status']
    ];

    const results = [];
    for (const [endpoint, description] of endpoints) {
      const result = await this.checkEndpoint(endpoint, description);
      results.push(result);
      console.log(`${result.status === 'SUCCESS' ? '✅' : '❌'} ${description}: ${result.status}`);
    }

    // Generate summary
    const successful = results.filter(r => r.status === 'SUCCESS');
    const avgQuality = successful.reduce((acc, r) => acc + (r.quality?.score || 0), 0) / successful.length;

    console.log('\n📊 Data Quality Summary:');
    console.log(`Success Rate: ${successful.length}/${results.length} endpoints (${Math.round(successful.length/results.length*100)}%)`);
    console.log(`Average Quality Score: ${Math.round(avgQuality)}/100`);

    // Show critical issues
    console.log('\n🚨 Critical Issues Found:');
    successful.forEach(result => {
      if (result.quality?.issues.length > 0) {
        console.log(`\n${result.description}:`);
        result.quality.issues.forEach(issue => console.log(`  • ${issue}`));
      }
    });

    this.results = results;
    return {
      results,
      successRate: successful.length / results.length,
      averageQuality: avgQuality,
      criticalIssues: successful.filter(r => r.quality?.score < 50)
    };
  }
}

// Export default instance
export const dataQualityChecker = new DataQualityChecker();