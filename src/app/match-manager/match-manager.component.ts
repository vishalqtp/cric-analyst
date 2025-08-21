interface Partnership {
  batsmen: string;
  runs: number;
  balls: number;
  fallOver: string;
}

import { Component, OnInit } from '@angular/core';
import { MatchService, Tournament, MatchSummary } from './match.service';

@Component({
  selector: 'app-match-manager',
  templateUrl: './match-manager.component.html',
  styleUrls: ['./match-manager.component.scss']
})

export class MatchManagerComponent implements OnInit {
  private readonly STORAGE_KEY = 'cricket-analytics-state';
  loadingMatches = false;
  loadingMatchesForAnalysis = false;
  loadingTournaments = false;  // New loading state for tournaments
  loadingYears = false;        // New loading state for years
  loadingMatchDetails = false; // New loading state for match details
  selectedFiles: File[] = [];
  uploading = false;
  uploadMessage = '';
  mobileMenuOpen: boolean = false; 
  showUploadModal = false;
  uploadProgress = 0;
  matchResult: string = '';
  tournaments: Tournament[] = [];
  years: string[] = [];               // years as string[], matching API response
  matches: MatchSummary[] = [];
  selectedInningIndex: number = 0;  // default to 1st inning
  availableInnings: string[] = [];
  showFailurePopup = false;
  failureMatches: any[] = [];
  selectedViewType: string | null = null;
  partnerships: Partnership[] = [];
  partnershipSummary: { [key: string]: number } = {};
  showWarningPopup = false;
  warningMessage = '';
  venueFailuresCount: { [venue: string]: number } = {};
  teamFailuresCount: { [team: string]: number } = {};

  availableTeams: string[] = [];
  availableVenues: string[] = [];

  selectedTeam: string = '';
  selectedVenue: string = '';

  allMatches: MatchSummary[] = []; // Store original unfiltered matches
  showWarning = false;

  showAlert = false;
  alertMessage = '';

  selectedTournamentId: string | null = null;
  selectedYear: string | null = null;
  selectedMatchId: number | null = null;   // match ID as number
  matchDetails: any = null;
  expandedFailures = new Set<number>();
  isFullScreen = false;
  showLowWicketFailurePopup = false;
  lowWicketFailureMatches: any[] = [];
  lowWicketVenueFailuresCount: { [venue: string]: number } = {};
  lowWicketTeamFailuresCount: { [team: string]: number } = {};

  // New properties for enhanced partnership failure analysis
  showParameterSelectionModal = false;
  selectedRuns = 25; // Default runs threshold
  selectedWickets = 5; // Default wickets to check
  runsOptions: number[] = Array.from({length: 50}, (_, i) => i + 1); // 1 to 50
  wicketsOptions: number[] = Array.from({length: 10}, (_, i) => i + 1); // 1 to 10

  constructor(private matchService: MatchService) {}

  ngOnInit() {
this.loadTournaments();
  // Clear previous state on app initialization
  this.clearPreviousState(); 
  
if (this.isPWA()) {
    console.log('PWA detected - clearing previous state');
    this.clearPreviousState();
  } else {
    // Always clear for consistency
    this.clearPreviousState();
  }
}

  hasActiveFilters(): boolean {
  return !!(
    this.selectedTournamentId || 
    this.selectedYear || 
    this.selectedTeam || 
    this.selectedVenue || 
    this.selectedMatchId || 
    this.selectedViewType
  );
}


// Method to clear all filters
clearAllFilters(): void {
  // Reset all filter values
  this.selectedTournamentId = null;
  this.selectedYear = null;
  this.selectedTeam = '';
  this.selectedVenue = '';
  this.selectedMatchId = null;
  this.selectedViewType = null;
  
  // Reset all data arrays
  this.years = [];
  this.matches = [];
  this.allMatches = [];
  this.availableTeams = [];
  this.availableVenues = [];
  this.matchDetails = null;
  this.partnerships = [];
  this.partnershipSummary = {};
  this.availableInnings = [];
  this.selectedInningIndex = 0;
  this.matchResult = '';
  
  // Reset loading states
  this.loadingYears = false;
  this.loadingMatches = false;
  this.loadingMatchDetails = false;
  
  // Clear any stored state
  this.clearStoredState();
  
  console.log('All filters cleared');
}

// Method to clear stored state (PWA persistence)
private clearStoredState(): void {
  try {
    localStorage.removeItem(this.STORAGE_KEY);
    sessionStorage.removeItem(this.STORAGE_KEY);
  } catch (error) {
    console.warn('Could not clear stored state:', error);
  }
}

// Method to clear previous state on app initialization
private clearPreviousState(): void {
  this.clearStoredState();
  
  // Reset all component state
  this.selectedTournamentId = null;
  this.selectedYear = null;
  this.selectedTeam = '';
  this.selectedVenue = '';
  this.selectedMatchId = null;
  this.selectedViewType = null;
  this.years = [];
  this.matches = [];
  this.allMatches = [];
  this.availableTeams = [];
  this.availableVenues = [];
  this.matchDetails = null;
  this.partnerships = [];
  this.partnershipSummary = {};
  this.availableInnings = [];
  this.selectedInningIndex = 0;
  this.matchResult = '';
  
  console.log('Previous state cleared on app initialization');
}

// Optional: Method to save state if you want selective persistence
private saveState(): void {
  try {
    const state = {
      selectedTournamentId: this.selectedTournamentId,
      selectedYear: this.selectedYear,
      // Add other properties you want to persist
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.warn('Could not save state:', error);
  }
}

  get selectedTournamentName(): string {
    if (!this.selectedTournamentId) return '';
    const tournament = this.tournaments.find(t => t.id === this.selectedTournamentId);
    return tournament ? tournament.name : '';
  }

  onFilesSelected(event: any) {
    const files: FileList = event.target.files;
    this.selectedFiles = Array.from(files);
  }

  getTeamDisplayName(teamName: string, collapsedTeam: string): string {
    if (!teamName || !collapsedTeam) return teamName;
    if (teamName.trim().toLowerCase() === collapsedTeam.trim().toLowerCase()) {
      return `${teamName} (bat)`;
    }
    return teamName;
  }

  toggleUploadModal() {
    this.showUploadModal = !this.showUploadModal;
    if (!this.showUploadModal) {
      this.resetUploadState();
    }
  }

  closeUploadModal() {
    this.showUploadModal = false;
    this.resetUploadState();
  }

  private resetUploadState() {
    this.selectedFiles = [];
    this.uploading = false;
    this.uploadMessage = '';
    this.uploadProgress = 0;
  }

  // Enhanced upload method with progress tracking
  uploadFiles() {
    if (this.selectedFiles.length === 0) {
      this.uploadMessage = 'Please select files first.';
      return;
    }

    const batchSize = 20;
    const totalFiles = this.selectedFiles.length;
    let uploadedCount = 0;
    this.uploading = true;
    this.uploadMessage = '';
    this.uploadProgress = 0;

    const uploadBatch = (batchFiles: File[]) => {
      const formData = new FormData();
      batchFiles.forEach(file => formData.append('files', file, file.name));
      return this.matchService.uploadMatches(formData).toPromise();
    };

    const uploadAllBatches = async () => {
      try {
        const totalBatches = Math.ceil(totalFiles / batchSize);
        
        for (let i = 0; i < totalFiles; i += batchSize) {
          const batchFiles = this.selectedFiles.slice(i, i + batchSize);
          await uploadBatch(batchFiles);

          uploadedCount += batchFiles.length;
          this.uploadProgress = Math.round((uploadedCount / totalFiles) * 100);
          this.uploadMessage = `Uploaded ${uploadedCount} of ${totalFiles} files...`;
          
          // Small delay to show progress
          if (i + batchSize < totalFiles) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        this.uploadMessage = 'Upload successful for all files!';
        this.uploadProgress = 100;
        this.loadTournaments(); // refresh after upload
        
        // Auto close modal after success
        setTimeout(() => {
          this.closeUploadModal();
        }, 2000);

      } catch (err) {
        this.uploadMessage = 'Upload failed during batch upload.';
        console.error('Upload error:', err);
      } finally {
        this.uploading = false;
      }
    };

    uploadAllBatches();
  }

  loadTournaments() {
    this.loadingTournaments = true;
    this.matchService.getTournaments().subscribe(
      data => {
        this.tournaments = data;
        this.loadingTournaments = false;
      },
      error => {
        console.error('Error loading tournaments:', error);
        this.loadingTournaments = false;
      }
    );
  }

  onMatchChange() {
    this.matchDetails = null;
    this.partnerships = [];
    this.partnershipSummary = {};
    this.matchResult = '';
    this.availableInnings = [];
    this.selectedInningIndex = 0;
    this.loadingMatchDetails = true;

    if (this.selectedMatchId !== null) {
      this.matchService.getMatchDetails(this.selectedMatchId).subscribe(
        details => {
          this.matchDetails = details;

          const outcome = this.matchDetails?.info?.outcome;
          if (outcome) {
            if (outcome.result) {
              this.matchResult = outcome.result;
            } else if (outcome.winner && outcome.by) {
              if (outcome.by.runs) {
                this.matchResult = `${outcome.winner} won by ${outcome.by.runs} runs`;
              } else if (outcome.by.wickets) {
                this.matchResult = `${outcome.winner} won by ${outcome.by.wickets} wickets`;
              }
            }
          }

          // Set available innings names
          this.availableInnings = this.matchDetails?.innings?.map((inn: any, index: number) => {
            return `${index + 1}${this.getInningSuffix(index + 1)} Inning - ${inn.team}`;
          }) || [];

          if (this.selectedViewType === 'partnership') {
            this.generatePartnerships();
          }
          
          this.loadingMatchDetails = false;
        },
        error => {
          console.error('Error loading match details:', error);
          this.loadingMatchDetails = false;
        }
      );
    } else {
      this.loadingMatchDetails = false;
    }
  }

  // For suffix like 1st, 2nd, etc.
  getInningSuffix(i: number): string {
    if (i % 100 >= 11 && i % 100 <= 13) return 'th';
    const lastDigit = i % 10;
    return lastDigit === 1 ? 'st' : lastDigit === 2 ? 'nd' : lastDigit === 3 ? 'rd' : 'th';
  }

  onViewTypeChange() {
    if (this.selectedViewType === 'partnership' && this.matchDetails) {
      this.generatePartnerships();
    }
  }

  generatePartnerships() {
    const innings = this.matchDetails?.innings;
    if (!innings || innings.length === 0 || !innings[this.selectedInningIndex]) return;
    const inning = innings[this.selectedInningIndex];
    if (!inning.overs) return;
    let currentStriker = '';
    let currentNonStriker = '';
    let runs = 0;
    let balls = 0;
    let fallOver = '';
    const partnerships: Partnership[] = [];
    const summary: { [key: string]: number } = {};
    for (let overObj of inning.overs) {
      const over = overObj.over;
      for (let i = 0; i < overObj.deliveries.length; i++) {
        const ball = overObj.deliveries[i];
        const deliveryNumber = i + 1;
        const overString = `${over}.${deliveryNumber}`;

        if (runs === 0 && balls === 0) {
          currentStriker = ball.batter;
          currentNonStriker = ball.non_striker;
        }
        runs += ball.runs?.total || 0;
        balls++;

        if (ball.wickets && ball.wickets.length > 0) {
          fallOver = overString;
          partnerships.push({
            batsmen: `${currentStriker} - ${currentNonStriker}`,
            runs,
            balls,
            fallOver
          });

          const milestones = [20, 25, 30, 35, 40, 45, 50];
          for (const m of milestones) {
            if (runs >= m) summary[`${m}`] = (summary[`${m}`] || 0) + 1;
          }

          runs = 0;
          balls = 0;
        }
      }
    }

    if (runs > 0) {
      partnerships.push({
        batsmen: `${currentStriker} - ${currentNonStriker}`,
        runs,
        balls,
        fallOver: 'N/A'
      });
    }

    this.partnerships = partnerships;
    this.partnershipSummary = summary;
  }

  getWicketLabel(index: number): string {
    const i = index + 1;
    if (i % 100 >= 11 && i % 100 <= 13) {
      return `${i}th wkt`;
    }

    const lastDigit = i % 10;
    let suffix = 'th';

    if (lastDigit === 1) suffix = 'st';
    else if (lastDigit === 2) suffix = 'nd';
    else if (lastDigit === 3) suffix = 'rd';
    return `${i}${suffix} wkt`;
  }

  isWinner(): boolean {
    if (!this.matchDetails) return false;
    // Simple heuristic: if outcome.winner matches team[0] or team[1], return true
    // You can customize this logic based on your data
    const outcome = this.matchDetails.info.outcome;
    if (!outcome) return false;
    if (outcome.winner) {
      return this.matchDetails.info.teams.includes(outcome.winner);
    }
    return false;
  }

  getPartnershipSummaryText(): string {
    if (!this.partnershipSummary) return '';
    const keys = [20, 25, 30, 35, 40, 45, 50];
    return keys
      .map(key => `${key}+ runs partnership: ${this.partnershipSummary[key] || 0}`)
      .join(', ');
  }

  getTeamScores(): string[] {
    const scores: string[] = [];

    const innings = this.matchDetails?.innings;
    if (!innings || innings.length === 0) return scores;

    for (const inning of innings) {
      const teamName = inning.team;
      let totalRuns = 0;
      let totalWickets = 0;
      let totalOvers = 0;
      let lastOverBalls = 0;

      for (const over of inning.overs) {
        totalOvers++;
        lastOverBalls = over.deliveries.length;

        for (const delivery of over.deliveries) {
          totalRuns += delivery.runs?.total || 0;
          if (delivery.wickets && delivery.wickets.length > 0) {
            totalWickets += delivery.wickets.length;
          }
        }
      }

      const oversFormatted = `${totalOvers - 1}.${lastOverBalls}`;
      const scoreLine = `${teamName} - ${totalRuns}/${totalWickets} (${oversFormatted})`;
      scores.push(scoreLine);
    }

    return scores;
  }

  // Updated method to open parameter modal with loading state
  openPartnershipFailures() {
    if (!this.selectedTournamentId || !this.selectedYear) {
      this.showAlert = true;
      this.alertMessage = 'Please select tournament and year to check partnership failure record.';
      return;
    }

    // Always open the parameter modal
    this.selectedRuns = 25;
    this.selectedWickets = 5;
    this.showParameterSelectionModal = true;

    // Check if data is available or loading
    if (this.loadingMatches) {
      this.loadingMatchesForAnalysis = true;
      // Wait for data to load
      this.waitForMatchData();
    } else if (!this.allMatches || this.allMatches.length === 0) {
      this.loadingMatchesForAnalysis = true;
      // Try to reload data
      this.reloadMatchData();
    } else {
      this.loadingMatchesForAnalysis = false;
    }
  }

  // Method to wait for existing data loading to complete
  private waitForMatchData() {
    const checkInterval = setInterval(() => {
      if (!this.loadingMatches) {
        clearInterval(checkInterval);
        if (this.allMatches && this.allMatches.length > 0) {
          this.loadingMatchesForAnalysis = false;
        } else {
          // If still no data, try reloading
          this.reloadMatchData();
        }
      }
    }, 200);

    // Timeout after 10 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      if (this.loadingMatchesForAnalysis) {
        this.loadingMatchesForAnalysis = false;
        // Show error in modal or handle as needed
      }
    }, 10000);
  }

  // Method to reload match data
  private reloadMatchData() {
    if (!this.selectedTournamentId || !this.selectedYear) {
      this.loadingMatchesForAnalysis = false;
      return;
    }

    this.loadingMatchesForAnalysis = true;
    this.matchService.getMatches(this.selectedTournamentId, Number(this.selectedYear)).subscribe(
      (matches) => {
        const venuesSet = new Set<string>();
        const teamsSet = new Set<string>();

        const matchesWithDetails = matches.map((match) => {
          let parsed: any = {};
          try {
            if (match.jsonData) {
              parsed = JSON.parse(match.jsonData);
              if (parsed?.info?.venue) venuesSet.add(parsed.info.venue);
              if (parsed?.info?.teams) parsed.info.teams.forEach((t: string) => teamsSet.add(t));
            }
          } catch (err) {
            console.error('Error parsing JSON data:', err);
          }

          return {
            ...match,
            teams: parsed?.info?.teams || ['Unknown', 'Unknown'],
            info: parsed?.info || {},
          };
        });

        this.availableVenues = Array.from(venuesSet).sort();
        this.availableTeams = Array.from(teamsSet).sort();
        this.matches = matchesWithDetails;
        this.allMatches = matchesWithDetails;
        this.loadingMatchesForAnalysis = false;
        
        console.log('Matches reloaded for analysis:', this.allMatches.length);
      },
      (error) => {
        console.error('Error loading matches for analysis:', error);
        this.loadingMatchesForAnalysis = false;
      }
    );
  }

  // Method to close parameter selection modal
  closeParameterSelectionModal() {
    this.showParameterSelectionModal = false;
  }

  // Updated analyze method to check if data is ready
  analyzePartnershipFailures() {
    if (this.loadingMatchesForAnalysis) {
      // Don't close modal, just return - user should wait
      return;
    }

    if (!this.allMatches || this.allMatches.length === 0) {
      // Show error but keep modal open
      this.showAlert = true;
      this.alertMessage = 'No matches data available. Please try selecting tournament and year again.';
      return;
    }

    this.closeParameterSelectionModal();
    
    this.failureMatches = [];
    this.venueFailuresCount = {};
    this.teamFailuresCount = {};

    this.allMatches.forEach((match) => {
      if (!match.jsonData) return;

      try {
        const parsed = JSON.parse(match.jsonData);

        (parsed.innings || []).forEach((inning: any, index: number) => {
          let partnerships: any[] = [];
          let runs = 0, balls = 0, batsmen = '', fallOver = '';

          inning.overs.forEach((over: any) => {
            over.deliveries.forEach((delivery: any, ballIndex: number) => {
              if (runs === 0 && balls === 0) {
                batsmen = `${delivery.batter} - ${delivery.non_striker}`;
              }
              runs += delivery.runs?.total || 0;
              balls++;
              if (delivery.wickets && delivery.wickets.length > 0) {
                fallOver = `${over.over}.${ballIndex + 1}`;
                partnerships.push({ wicket: partnerships.length + 1, batsmen, runs, balls, fallOver });
                runs = 0;
                balls = 0;
              }
            });
          });

          if (runs > 0) {
            partnerships.push({ wicket: partnerships.length + 1, batsmen, runs, balls, fallOver: 'N/A' });
          }

          const wicketsToCheck = partnerships.slice(0, this.selectedWickets);
          
          if (wicketsToCheck.length > 0) {
            const hasGoodPartnership = wicketsToCheck.some(p => p.runs >= this.selectedRuns);

            if (!hasGoodPartnership) {
              const failureMatch = {
                matchName: parsed.info?.teams?.join(' vs '),
                venue: parsed.info?.venue || '',
                inning: index + 1,
                partnerships: partnerships.slice(0, this.selectedWickets),
                collapsedTeam: parsed.info?.teams ? parsed.info.teams[index === 0 ? 0 : 1] : '',
                runsThreshold: this.selectedRuns,
                wicketsChecked: this.selectedWickets,
                actualWicketsAnalyzed: wicketsToCheck.length
              };
              this.failureMatches.push(failureMatch);

              this.venueFailuresCount[failureMatch.venue] = (this.venueFailuresCount[failureMatch.venue] || 0) + 1;

              if (failureMatch.collapsedTeam) {
                this.teamFailuresCount[failureMatch.collapsedTeam] = (this.teamFailuresCount[failureMatch.collapsedTeam] || 0) + 1;
              }
            }
          }
        });
      } catch (err) {
        console.error('Error parsing match JSON:', err);
      }
    });

    this.showFailurePopup = true;
  }

  openLowWicketFailures() {
    if (!this.selectedTournamentId || !this.selectedYear) {
      this.showAlert = true;
      this.alertMessage = 'Please select tournament and year to check low wicket failure record.';
      return;
    }

    if (!this.allMatches || this.allMatches.length === 0) {
      alert('Please select a tournament and year first.');
      return;
    }

    this.lowWicketFailureMatches = [];
    this.venueFailuresCount = {};
    this.teamFailuresCount = {};

    this.allMatches.forEach((match) => {
      if (!match.jsonData) return;

      try {
        const parsed = JSON.parse(match.jsonData);

        (parsed.innings || []).forEach((inning: any, index: number) => {
          let partnerships: any[] = [];
          let runs = 0, balls = 0, batsmen = '', fallOver = '';

          inning.overs.forEach((over: any) => {
            over.deliveries.forEach((delivery: any, ballIndex: number) => {
              if (runs === 0 && balls === 0) {
                batsmen = `${delivery.batter} - ${delivery.non_striker}`;
              }
              runs += delivery.runs?.total || 0;
              balls++;
              if (delivery.wickets && delivery.wickets.length > 0) {
                fallOver = `${over.over}.${ballIndex + 1}`;
                partnerships.push({ wicket: partnerships.length + 1, batsmen, runs, balls, fallOver });
                runs = 0;
                balls = 0;
              }
            });
          });

          if (runs > 0) {
            partnerships.push({ wicket: partnerships.length + 1, batsmen, runs, balls, fallOver: 'N/A' });
          }

          // Only take up to first 5 wickets that fell (or fewer)
          const wicketsToCheck = partnerships.slice(0, 5);

          // Check if any partnership was <= 20 runs
          const anyWicketBelowOrEqual20 = wicketsToCheck.some(p => p.runs <= 20);

          // If none of the wickets fell <= 20, mark failure
          if (!anyWicketBelowOrEqual20 && wicketsToCheck.length > 0) {
            const failureMatch = {
              matchName: parsed.info?.teams?.join(' vs '),
              venue: parsed.info?.venue || '',
              inning: index + 1,
              partnerships: wicketsToCheck,
              collapsedTeam: parsed.info?.teams ? parsed.info.teams[index === 0 ? 0 : 1] : ''
            };

            this.lowWicketFailureMatches.push(failureMatch);

            this.venueFailuresCount[failureMatch.venue] = (this.venueFailuresCount[failureMatch.venue] || 0) + 1;

            if (failureMatch.collapsedTeam) {
              this.teamFailuresCount[failureMatch.collapsedTeam] = (this.teamFailuresCount[failureMatch.collapsedTeam] || 0) + 1;
            }
          }
        });
      } catch (err) {
        console.error('Error parsing match JSON:', err);
      }
    });

    this.showLowWicketFailurePopup = true;
  }

  countLowWicketFailuresByInning(inningNumber: number): number {
    return this.lowWicketFailureMatches.filter(m => m.inning === inningNumber).length;
  }

  lowWicketVenueFailuresKeys() {
    return Object.keys(this.lowWicketVenueFailuresCount);
  }

  lowWicketTeamFailuresKeys() {
    return Object.keys(this.lowWicketTeamFailuresCount);
  }

  closeAlert() {
    this.showAlert = false;
  }

  toggleFailureDetails(index: number) {
    if (this.expandedFailures.has(index)) {
      this.expandedFailures.delete(index);
    } else {
      this.expandedFailures.add(index);
    }
  }

  isFailureExpanded(index: number): boolean {
    return this.expandedFailures.has(index);
  }

  countFailuresByInning(inningNumber: number): number {
    return this.failureMatches.filter(m => m.inning === inningNumber).length;
  }

  venueFailuresKeys() {
    return Object.keys(this.venueFailuresCount);
  }

  teamFailuresKeys() {
    return Object.keys(this.teamFailuresCount);
  }

  toggleFullScreen() {
    this.isFullScreen = !this.isFullScreen;
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    // Add body scroll prevention for iOS
    if (this.mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed'; // Additional fix for iOS
      document.body.style.width = '100%'; // Additional fix for iOS
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
  }

  closeMobileMenu() {
    this.mobileMenuOpen = false;
    // Reset body styles
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
  }

  getTournamentPlaceholder(): string {
  if (this.loadingTournaments) {
    return 'Loading tournaments...';
  }
  if (this.tournaments.length === 0) {
    return 'No tournaments available';
  }
  return 'Select Tournament';
}

getYearPlaceholder(): string {
  if (this.loadingYears) {
    return 'Loading years...';
  }
  if (!this.selectedTournamentId) {
    return 'Select tournament first';
  }
  if (this.years.length === 0) {
    return 'No years available';
  }
  return 'Select Year';
}

getTeamPlaceholder(): string {
  if (this.loadingMatches) {
    return 'Loading teams...';
  }
  if (!this.selectedYear) {
    return 'Select year first';
  }
  if (this.availableTeams.length === 0) {
    return 'No teams available';
  }
  return 'All Teams';
}

getVenuePlaceholder(): string {
  if (this.loadingMatches) {
    return 'Loading venues...';
  }
  if (!this.selectedYear) {
    return 'Select year first';
  }
  if (this.availableVenues.length === 0) {
    return 'No venues available';
  }
  return 'All Venues';
}

getMatchPlaceholder(): string {
  if (this.loadingMatches) {
    return 'Loading matches...';
  }
  if (!this.selectedYear) {
    return 'Select year first';
  }
  if (this.matches.length === 0) {
    return 'No matches available';
  }
  return 'Select Match';
}
getViewTypePlaceholder(): string {
  if (this.loadingMatchDetails) {
    return 'Loading match details...';
  }
  if (!this.selectedMatchId) {
    return 'Select match first';
  }
  return 'Select View';
}


// Update your existing methods to handle state clearing
onTournamentChange() {
  // Clear dependent filters when tournament changes
  this.selectedYear = null;
  this.selectedTeam = '';
  this.selectedVenue = '';
  this.selectedMatchId = null;
  this.selectedViewType = null;
  
  this.years = [];
  this.matches = [];
  this.allMatches = [];
  this.availableTeams = [];
  this.availableVenues = [];
  this.matchDetails = null;
  this.loadingYears = true;

  if (this.selectedTournamentId) {
    this.matchService.getYears(this.selectedTournamentId).subscribe(
      years => {
        this.years = years;
        this.loadingYears = false;
      },
      error => {
        console.error('Error loading years:', error);
        this.loadingYears = false;
      }
    );
  } else {
    this.loadingYears = false;
  }
}

onYearChange() {
  // Clear dependent filters when year changes
  this.selectedTeam = '';
  this.selectedVenue = '';
  this.selectedMatchId = null;
  this.selectedViewType = null;
  
  this.matches = [];
  this.matchDetails = null;
  this.availableTeams = [];
  this.availableVenues = [];
  this.allMatches = [];
  this.loadingMatches = true;

  if (this.selectedTournamentId && this.selectedYear) {
    this.matchService.getMatches(this.selectedTournamentId, Number(this.selectedYear)).subscribe(
      (matches) => {
        const venuesSet = new Set<string>();
        const teamsSet = new Set<string>();

        const matchesWithDetails = matches.map((match) => {
          let parsed: any = {};
          try {
            if (match.jsonData) {
              parsed = JSON.parse(match.jsonData);
              if (parsed?.info?.venue) venuesSet.add(parsed.info.venue);
              if (parsed?.info?.teams) parsed.info.teams.forEach((t: string) => teamsSet.add(t));
            }
          } catch (err) {
            console.error('Error parsing JSON data:', err);
          }

          return {
            ...match,
            teams: parsed?.info?.teams || ['Unknown', 'Unknown'],
            info: parsed?.info || {},
          };
        });

        this.availableVenues = Array.from(venuesSet).sort();
        this.availableTeams = Array.from(teamsSet).sort();
        this.matches = matchesWithDetails;
        this.allMatches = matchesWithDetails;
        this.loadingMatches = false;
        
        console.log('Matches loaded:', this.allMatches.length);
      },
      (error) => {
        console.error('Error loading matches:', error);
        this.allMatches = [];
        this.matches = [];
        this.loadingMatches = false;
      }
    );
  } else {
    this.loadingMatches = false;
  }
}

applyMatchFilters() {
  this.matches = this.allMatches.filter(match => {
    const teamMatch = !this.selectedTeam || (match.info?.teams && match.info.teams.includes(this.selectedTeam));
    const venueMatch = !this.selectedVenue || (match.info?.venue === this.selectedVenue);
    return teamMatch && venueMatch;
  });

  // Reset match selection when filters change
  this.selectedMatchId = null;
  this.selectedViewType = null;
  this.matchDetails = null;
  
  console.log(`Filtered matches: ${this.matches.length} out of ${this.allMatches.length} total matches`);
}
// Add to ngOnInit if you want to detect PWA mode
private isPWA(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true ||
         document.referrer.includes('android-app://');
}
}