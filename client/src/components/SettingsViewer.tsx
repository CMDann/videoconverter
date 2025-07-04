import React, { useState, useEffect } from 'react';

interface Settings {
  [key: string]: string;
}

interface ColorPreset {
  name: string;
  colors: Settings;
}

const SettingsViewer: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Color presets
  const colorPresets: ColorPreset[] = [
    {
      name: 'Matrix Green',
      colors: {
        'theme_primary_color': '#00ff00',
        'theme_secondary_color': '#00cc00',
        'theme_background_color': '#1a1a1a',
        'theme_card_background': '#2a2a2a',
        'theme_border_color': '#00ff00',
        'theme_text_color': '#00ff00',
        'theme_error_color': '#ff0000',
        'theme_success_color': '#00ff00',
        'theme_warning_color': '#ffff00',
        'theme_name': 'Matrix Green'
      }
    },
    {
      name: 'Cyber Blue',
      colors: {
        'theme_primary_color': '#00ccff',
        'theme_secondary_color': '#0099cc',
        'theme_background_color': '#1a1a2e',
        'theme_card_background': '#2a2a4a',
        'theme_border_color': '#00ccff',
        'theme_text_color': '#00ccff',
        'theme_error_color': '#ff0066',
        'theme_success_color': '#00ff99',
        'theme_warning_color': '#ffcc00',
        'theme_name': 'Cyber Blue'
      }
    },
    {
      name: 'Neon Purple',
      colors: {
        'theme_primary_color': '#cc00ff',
        'theme_secondary_color': '#9900cc',
        'theme_background_color': '#1a0a2e',
        'theme_card_background': '#2a1a4a',
        'theme_border_color': '#cc00ff',
        'theme_text_color': '#cc00ff',
        'theme_error_color': '#ff0066',
        'theme_success_color': '#00ff99',
        'theme_warning_color': '#ffcc00',
        'theme_name': 'Neon Purple'
      }
    },
    {
      name: 'Terminal Orange',
      colors: {
        'theme_primary_color': '#ff9900',
        'theme_secondary_color': '#cc7700',
        'theme_background_color': '#1a1a0a',
        'theme_card_background': '#2a2a1a',
        'theme_border_color': '#ff9900',
        'theme_text_color': '#ff9900',
        'theme_error_color': '#ff0000',
        'theme_success_color': '#00ff00',
        'theme_warning_color': '#ffff00',
        'theme_name': 'Terminal Orange'
      }
    }
  ];

  // Load settings on component mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('http://localhost:5001/api/settings');
      if (!response.ok) {
        throw new Error('Failed to load settings');
      }
      
      const data = await response.json();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: Settings) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const response = await fetch('http://localhost:5001/api/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: newSettings }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to save settings');
      }
      
      setSettings(newSettings);
      setSuccess('Settings saved successfully!');
      
      // Apply theme changes immediately
      applyTheme(newSettings);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const applyTheme = (themeSettings: Settings) => {
    const root = document.documentElement;
    
    // Apply CSS custom properties
    Object.entries(themeSettings).forEach(([key, value]) => {
      if (key.startsWith('theme_') && key !== 'theme_name') {
        const cssVar = `--${key.replace('theme_', '').replace('_', '-')}`;
        root.style.setProperty(cssVar, value);
      }
    });
  };

  const handleColorChange = (key: string, value: string) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
  };

  const applyPreset = (preset: ColorPreset) => {
    const newSettings = { ...settings, ...preset.colors };
    setSettings(newSettings);
  };

  const resetToDefaults = () => {
    applyPreset(colorPresets[0]); // Matrix Green is the default
  };

  if (loading) {
    return (
      <div className="function-card">
        <h2 className="function-title">⚙️ Settings</h2>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ color: '#00ff00', fontSize: '1.2rem' }}>Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="function-card">
      <h2 className="function-title">⚙️ Theme Customization</h2>
      <p className="function-description">
        Customize the color scheme of your video editing software
      </p>

      {error && (
        <div className="error" style={{ marginBottom: '20px' }}>
          Error: {error}
        </div>
      )}

      {success && (
        <div className="success" style={{ marginBottom: '20px' }}>
          {success}
        </div>
      )}

      {/* Color Presets */}
      <div style={{
        backgroundColor: '#333',
        border: '2px solid #00ff00',
        borderRadius: '10px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h3 style={{ color: '#00ff00', marginBottom: '15px' }}>🎨 Color Presets</h3>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '10px',
          marginBottom: '15px'
        }}>
          {colorPresets.map((preset, index) => (
            <button
              key={index}
              className="btn btn-secondary"
              onClick={() => applyPreset(preset)}
              style={{
                padding: '10px',
                backgroundColor: preset.colors.theme_card_background,
                borderColor: preset.colors.theme_primary_color,
                color: preset.colors.theme_text_color,
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <div style={{
                position: 'absolute',
                top: '5px',
                right: '5px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: preset.colors.theme_primary_color,
                border: `2px solid ${preset.colors.theme_border_color}`
              }}></div>
              {preset.name}
            </button>
          ))}
        </div>
        <button
          className="btn btn-secondary"
          onClick={resetToDefaults}
          style={{ width: '100%' }}
        >
          🔄 Reset to Default (Matrix Green)
        </button>
      </div>

      {/* Custom Color Controls */}
      <div style={{
        backgroundColor: '#333',
        border: '2px solid #00ff00',
        borderRadius: '10px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h3 style={{ color: '#00ff00', marginBottom: '15px' }}>🎨 Custom Colors</h3>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '20px'
        }}>
          {Object.entries(settings).map(([key, value]) => {
            if (!key.startsWith('theme_') || key === 'theme_name') return null;
            
            const label = key.replace('theme_', '').replace('_', ' ')
              .replace(/\b\w/g, l => l.toUpperCase());
            
            return (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ 
                  color: '#00cc00', 
                  minWidth: '120px',
                  fontSize: '0.9rem',
                  fontWeight: 'bold'
                }}>
                  {label}:
                </label>
                <input
                  type="color"
                  value={value}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  style={{
                    width: '50px',
                    height: '30px',
                    border: '2px solid #00ff00',
                    borderRadius: '5px',
                    backgroundColor: 'transparent',
                    cursor: 'pointer'
                  }}
                />
                <input
                  type="text"
                  value={value}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  style={{
                    flex: 1,
                    padding: '5px 10px',
                    backgroundColor: '#444',
                    border: '1px solid #00ff00',
                    borderRadius: '5px',
                    color: '#00ff00',
                    fontFamily: 'monospace',
                    fontSize: '0.9rem'
                  }}
                  placeholder="#000000"
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Preview and Save */}
      <div style={{
        backgroundColor: '#333',
        border: '2px solid #00ff00',
        borderRadius: '10px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h3 style={{ color: '#00ff00', marginBottom: '15px' }}>👀 Preview</h3>
        <div style={{
          padding: '15px',
          backgroundColor: settings.theme_card_background || '#2a2a2a',
          border: `2px solid ${settings.theme_border_color || '#00ff00'}`,
          borderRadius: '10px',
          color: settings.theme_text_color || '#00ff00'
        }}>
          <p>This is how your interface will look with the current color scheme.</p>
          <button
            style={{
              padding: '8px 16px',
              backgroundColor: settings.theme_primary_color || '#00ff00',
              color: settings.theme_background_color || '#1a1a1a',
              border: 'none',
              borderRadius: '5px',
              fontWeight: 'bold',
              marginRight: '10px'
            }}
          >
            Primary Button
          </button>
          <button
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: settings.theme_secondary_color || '#00cc00',
              border: `2px solid ${settings.theme_secondary_color || '#00cc00'}`,
              borderRadius: '5px',
              fontWeight: 'bold'
            }}
          >
            Secondary Button
          </button>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ textAlign: 'center' }}>
        <button
          className="btn"
          onClick={() => saveSettings(settings)}
          disabled={saving}
          style={{
            padding: '15px 30px',
            fontSize: '1.1rem',
            minWidth: '200px'
          }}
        >
          {saving ? '💾 Saving...' : '💾 Save Theme Settings'}
        </button>
      </div>

      {/* Current Theme Info */}
      <div style={{
        marginTop: '20px',
        padding: '15px',
        backgroundColor: '#444',
        borderRadius: '10px',
        textAlign: 'center'
      }}>
        <div style={{ color: '#00cc00', fontSize: '0.9rem' }}>
          Current Theme: <strong>{settings.theme_name || 'Custom'}</strong>
        </div>
        <div style={{ color: '#888', fontSize: '0.8rem', marginTop: '5px' }}>
          Changes are applied immediately and saved to the database
        </div>
      </div>
    </div>
  );
};

export default SettingsViewer;